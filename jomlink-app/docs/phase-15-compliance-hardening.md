# Phase 15 — Compliance Hardening (Legal Gaps Closed)

**Status:** 🔵 Planned · **Depends on:** Phase 14 (verification-gated release), Phase 12 (lifecycle guards), Phase 7 (admin/RBAC) · **Updated:** 2026-10-15

> **Purpose.** This phase implements the **code-side** fixes for the legal loopholes
> identified in `legal-compliance-gaps.md` and now mandated by the blueprint v1.2
> (§11.8, §11.9, §11.9.1, §11.9.2, §11.11). It does **not** replace the Malaysian
> counsel / payment-provider review (that is a parallel, non-code deliverable). The
> items below are the engineering steps needed so the platform **stops doing the
> things Part 11 forbids**.
>
> Blueprint ref: `../JOMLINK PLATFORM BLUEPRINT v1.2.md`. Gap IDs reference
> `legal-compliance-gaps.md`.

---

## 0. Pre-flight — apply the Phase 14 migration (G-2)

**Before any code in this phase**, apply `supabase/phase-14-verification-gated-release.sql`
in the Supabase SQL Editor. It adds the `connection_status` enum values
(`EVIDENCE_SUBMITTED`, `AWAITING_SEEKER_CONFIRMATION`, `VERIFIED`) and 9 `connections`
columns. Without it, the verification-gated release cannot run and every downstream test
is invalid.

- [ ] Migration applied (idempotent — safe to re-run).
- [ ] `select enumlabel ... where typname='connection_status'` shows the 4 new values.
- [ ] `connections` has `evidence_submitted_at`, `seeker_confirmed_at`,
      `seeker_confirmation_status`, `verification_status`, `verified_at`,
      `verification_notes`, `risk_score`, `risk_level`, `release_hold_until`.

---

## 1. Server-side category deny-list (G-1, `LEG-02/03/06`)

**Status: ✅ BUILT 2026-10-26** (rule 4 — the versioned/DB-backed enablement record —
is still open; see *Remaining* below).

### Goal
Make `GOVERNMENT_PUBLIC_SECTOR` and `INVESTOR_CONNECTION` **unpostable and unfundable**
until Compliance enables them. Default-deny, fail-closed, enforced at every entry point.

### Files to touch
- `src/lib/constants.ts` — add a `DISABLED_CATEGORIES` config (source of truth).
- `src/app/actions/opportunities.ts` — reject in `createOpportunityAction` (both
  `draft` and `publish` intents) **before** `chargePostingDeposit`.
- `src/app/actions/opportunities.ts` / `publishOpportunityAction` — reject publish of a
  disabled category.
- `src/app/actions/admin.ts` — `moderateOpportunityAction` (approve) must not set a
  disabled-category opportunity to `ACTIVE`.
- `src/app/actions/opportunities.ts` edit path — block editing a listing into a disabled
  category.
- `src/lib/matching.ts` + `constants.ts` `OPPORTUNITY_CATEGORIES` — do not surface
  disabled categories as selectable (UI + matching).

### Rules (blueprint §11.9.1)
1. Single **server-side** source of truth for enabled categories; default-deny.
2. A blocked listing must **not** charge the posting deposit.
3. Disabled categories are not selectable in the form, marketplace, or matching.
4. Enablement is a versioned, audited decision (risk owner, rationale, expiry, approver,
   audit event).
5. "Disabled" ≠ "restricted (visible to a subset)".

### Definition of done
- [x] Server rejects `create`/`publish`/`edit`/`approve` for a disabled category with a
      clear error and **no** deposit charge.
- [x] `INVESTOR_CONNECTION` is blocked with the same rigour as government.
- [x] Unit test: posting a disabled category is rejected
      (`src/lib/category-policy.test.ts`, 16 tests).
- [x] Audit event written on any attempted blocked post
      (`OPPORTUNITY_CATEGORY_BLOCKED`).
- [x] `tsc --noEmit`, `npm run build`, `npm test` all pass
      (135 tests / 10 files, 44 routes, lint 0/0).
- [ ] Enablement recorded as a **versioned, audited decision** in the database
      (risk owner, rationale, approver, expiry) — §11.9.1 rule 4. Today the
      enabled set is the `DISABLED_CATEGORY_VALUES` code constant.

### Implementation (2026-10-26)

- `src/lib/constants.ts` — `DISABLED_CATEGORY_VALUES` (single source of truth);
  `PUBLIC_OPPORTUNITY_CATEGORIES` derives from it, so the public/selectable list
  can never drift from the server rule.
- `src/lib/category-policy.ts` — pure module (no `"use server"`, no DB):
  `checkCategoryPostable()` / `isCategoryEnabled()` / `isCategoryDisabled()`.
  **Default-deny:** a category is postable only if it is a known enum member AND
  not on the deny-list, so a future enum value can never go live by accident.
  Returns a member-facing `message` that never leaks the internal vocabulary.
- Enforced **before** `chargePostingDeposit` in:
  `createOpportunityAction` (draft *and* publish intents), `publishOpportunityAction`,
  `updateOpportunityAction`, and `moderateOpportunityAction` (admin approve).
- Selectors built from `PUBLIC_OPPORTUNITY_CATEGORIES`: the post form, the edit
  form and the marketplace `?category=` filter. A listing already stored under a
  now-disabled category keeps its own value in *its own* editor (labelled
  "disabled") so an unrelated edit cannot silently re-categorise it.
- Every refusal writes `OPPORTUNITY_CATEGORY_BLOCKED` to `audit_logs` with the
  category, reason code, intent and `depositCharged: false`. Member attempts are
  written with `admin_id = null` and remain attributable via `details.userId`.
- `is_restricted_category` / `RESTRICTED` confidentiality is retained as the
  separate "enabled-but-restricted" concept (§11.9.1 rule 5) and is **not** used
  as a substitute for the hard block.

---

## 2. AML / KYC-before-payout gate (G-5, `LEG-04/05`)

**Status: ✅ BUILT 2026-10-26** (rule 5 — provider integration — is still open; see
*Remaining* below).

### Goal
Before any payout/withdrawal is settled, screen the recipient and require identity
verification. This is the minimum viable AMLATFA 2001 posture.

### Files to touch
- `src/app/actions/admin.ts` — `markPayoutPaidAction`: add a **KYC-before-payout** guard
  (recipient `verification_status === "VERIFIED"` / `verified_badge` true) and a
  **sanctions/PEP** screen hook before the ledger debit.
- `src/app/actions/payouts.ts` — `requestPayoutAction`: block the *request* if the member
  is not verified (or clearly mark it ineligible).
- `src/lib/` — add a `screening.ts` module (interface + stub now; provider-backed later).
- `src/lib/queries.ts` — helper to fetch recipient verification status at settlement.

### Rules (blueprint §11.9.2)
1. Sanctions/PEP/adverse-media screen before settlement; `BLOCKED` halts and routes to
   Compliance.
2. No money-out without identity verification.
3. Define threshold + structuring alerts (cumulative / single-transaction / circular).
4. Screening is recorded and attributable (immutable audit event: party, list version,
   result, reviewer, timestamp).
5. Document the provider's screening scope in writing (non-code deliverable).

### Definition of done
- [x] `markPayoutPaidAction` refuses unverified recipients and blocked screens.
- [x] Screening result recorded to `audit_logs` with list version + reviewer.
- [x] Unit test: unverified recipient payout is rejected
      (`src/lib/screening.test.ts`, 18 tests).
- [x] `tsc`, build, tests pass (153 tests / 11 files, 44 routes, lint 0/0).
- [ ] **Provider-backed** sanctions/PEP/adverse-media screen with the provider's
      reference retained per transaction (rule 5).

### Implementation (2026-10-26)

- `src/lib/constants.ts` — `AML` config block: `PAYOUT_REVIEW_THRESHOLD` (RM 10,000),
  `CUMULATIVE_PAYOUT_THRESHOLD` (RM 25,000 over `CUMULATIVE_WINDOW_DAYS` = 30),
  `RAPID_TOPUP_WINDOW_HOURS` (24), `LIST_VERSION`.
- `src/lib/screening.ts` — pure module (no DB, no `"use server"`):
  `screenPayout()` → `{risk, codes, reasons, listVersion, providerConfigured}`,
  plus `canSettlePayout()`, `requiresComplianceClearance()`, `hitDenyList()`.
  Precedence is **`BLOCKED` > `REVIEW` > `CLEAR`**.
  - `KYC_NOT_VERIFIED` → **BLOCKED** (rule 2). Never overridable — not by a
    checkbox, not by `SUPER_ADMIN`.
  - `SANCTIONS_HIT` → **BLOCKED** (rule 1). Screens both the member's registered
    name and the **bank beneficiary name** the money actually goes to.
  - `SINGLE_TRANSACTION_THRESHOLD`, `CUMULATIVE_THRESHOLD`,
    `RAPID_TOPUP_THEN_WITHDRAW` → **REVIEW** (rule 3), held for Compliance.
- `src/lib/queries.ts` — `isMemberVerifiedForPayout()` (fails closed: no profile
  row ⇒ not verified), `sumPayoutsInWindow()`, `lastWalletTopUpAt()`.
- `src/app/actions/payouts.ts` — `requestPayoutAction` refuses an unverified
  member **before** creating any payout row, so no dead work is queued; the
  refusal is audited (`PAYOUT_SCREEN_BLOCKED`, `stage: request`).
- `src/app/actions/admin.ts` — `markPayoutPaidAction` screens **before any ledger
  movement**. `screenPayoutForSettlement()` writes `PAYOUT_SCREEN_RECORDED` on
  every run (clear, review or blocked) and persists the verdict on the payout.
  New `clearPayoutForPaymentAction` (`compliance:write`) releases a `REVIEW` hold
  with a mandatory attributable rationale; it re-screens first and refuses to
  clear a `BLOCKED` payout. It does **not** pay — Finance still settles.
- `src/app/admin/transactions/page.tsx` (`?tab=requests`) — shows the screening
  verdict + signal codes and offers `Clear for payment` only to `compliance:write`.
- `src/app/dashboard/wallet/*` — the withdrawal panel states the KYC requirement
  and disables the button when the member is unverified (server still enforces).
- `supabase/phase-15-aml-screening.sql` — adds `payouts.screen_risk`,
  `screen_codes`, `screen_list_version`, `screened_at`, `cleared_by`,
  `cleared_at`, `clearance_note` + a partial index for the Compliance queue.

### Remaining (rule 5)

No sanctions/PEP/adverse-media **provider** is integrated. The screen applies a
local deny-list only and every audit entry carries `providerConfigured: false`,
so the gap is visible in the record instead of being mistaken for a clearance.
KYC-before-payout and the monitoring thresholds are fully enforced and do not
depend on the provider.

### Dev / test escape hatch (`KYC_DEV_BYPASS`)

Because KYC-before-payout blocks every withdrawal for an unverified member, the
withdrawal / payout / review-threshold / clearance flows are hard to exercise in
dev and QA. `src/lib/kyc-dev-bypass.ts` provides a switch that is **structurally
impossible to enable in production**:

1. `NODE_ENV === "production"` → refused **before** the flag is even read, so a
   stray `KYC_DEV_BYPASS=true` in a production `.env` changes nothing.
2. Outside production it still requires the explicit `KYC_DEV_BYPASS=true`
   opt-in — absent the flag, a normal dev session behaves like production.
3. Every use is audited (`KYC_DEV_VERIFIED`, and `devBypass: true` on the
   `PAYOUT_SCREEN_RECORDED` entry), so a faked badge is never silent.

Enable locally with `KYC_DEV_BYPASS=true` in `.env.local`, then visit
`/dashboard/kyc` → **Verify me (dev)**. Unset it to get real behaviour back.
Enforcement is centralised in `isKycSatisfiedForPayout()`; the unbypassable
`isMemberVerifiedForPayout()` remains available for reporting.


---

## 3. Biometric retention/purge + secondary-use consent (G-7, `PRIV-01`)

### Goal
Make the biometric pipeline PDPA-compliant: actually delete `purge_requested_at` rows, and
separate KYC consent from model-training (secondary-use) consent.

### Files to touch
- `src/lib/` — add a `biometricPurgeJob()` + a cron route
  `src/app/api/admin/biometrics/purge` (gated by `x-reconcile-secret`, mirrors
  `deadline-sweep` / `release-sweep`).
- `src/app/actions/kyc.ts` — split consent: add a distinct `training_consent` field +
  version (`BIOMETRIC_TRAINING_CONSENT_VERSION`); only collect for training when granted.
- `supabase/` — migration for `users.training_consent*` columns and (if needed) a
  `training_consent_version` on `kyc_biometrics`.
- `constants.ts` — add `BIOMETRIC_TRAINING_CONSENT_VERSION`.

### Rules (blueprint §11.11)
1. Purge job is mandatory (delete storage objects + rows for `purge_requested_at` set).
2. Training is a **separate secondary purpose** with its own specific consent + basis.

### Definition of done
- [ ] Purge job wired to a scheduler; deletes rows + private-bucket objects.
- [ ] Secondary-use consent is a distinct, versioned opt-in (not bundled).
- [ ] Unit test for purge job (rows flagged for purge are removed; non-flagged retained).
- [ ] `tsc`, build, tests pass.

---

## 4. Concurrency + stale escrow (G-11/G-12, `FIN-05`)

### Goal
Prove single-winner selection and reconcile the stale RM 2,200 escrow.

### Files to touch
- `src/app/actions/negotiations.ts` — `selectLinkerAction`: add an atomic guard
  (conditional update) so a second concurrent selection on a shared reward fails.
- `supabase/` — optional partial unique index on `connections(opportunity_id)` where
  `release_status` is open, or an application-level compare-and-set on `linker_id`.
- Resolve the documented stale RM 2,200 escrow (product decision + corrective ledger entry).

### Definition of done
- [ ] Two concurrent `selectLinkerAction` calls for one shared reward → exactly one winner
      (unit test, `verification.test.ts` style).
- [ ] Stale escrow reconciled with an audited adjustment entry.
- [ ] `tsc`, build, tests pass.

---

## 4b. Post-release clawback (§5.12.1, §11.7) — ✅ **BUILT 2026-10-26**

### Goal
Close the "Seeker discovers the meeting was fake a week later" gap: allow a
reward that has already been released to be recovered inside
`COMPLETION.DISPUTE_WINDOW_DAYS` (7).

### What §11.7 required (and how it is honoured)
| §11.7 rule | Implementation |
|---|---|
| Recovery is a workflow, not a silent reversal | `jomlink.clawbacks` row records decision, recovery, shortfall, provider response and actor |
| Do not silently make a wallet negative | `planClawback` caps recovery at the wallet balance; `recoverFromWallet = min(amount, balance)` |
| Record original payout, reason, provider response, recovered + outstanding | `original_payout_id`, `reason`, `provider_response`, `amount_recovered`, `amount_outstanding` |
| Never claim completion until recovered | `status` only becomes `RECOVERED` when `amount_outstanding = 0` |
| Route unrecoverable balance to manual review | `requires_manual_review = true` + `CLAWBACKS` tab + write-off requires a typed reason |

### Files
- `supabase/phase-15-clawback.sql` — `jomlink.clawbacks` + `CLAWBACK` enum values.
- `src/lib/clawback.ts` — `planClawback()`, `isWithinClawbackWindow()`, `clawbackDeadline()`.
- `src/app/actions/clawbacks.ts` — `openClawbackAction`, `recoverClawbackAction`,
  `cancelClawbackAction` (all `finance:payout`).
- `src/lib/ledger.ts` — new `accounts.platformClawback`.
- `src/lib/audit.ts` — `CLAWBACK_OPENED` / `CLAWBACK_RECOVERED` / `CLAWBACK_CLOSED`.
- UI — `admin/transactions` Clawbacks tab, `connections/[id]` admin panel.

### Definition of done
- [x] Recovery never exceeds the wallet balance or the payout cap (unit tests).
- [x] Shortfall recorded as outstanding and flagged for manual review.
- [x] Window measured from release, not creation; fails closed on bad input.
- [x] Audit events for open / recover / close.
- [x] `tsc`, lint, build, **119 tests** pass.
- [ ] Migration applied in Supabase (⚠️ not yet applied).

### Deliberate limitation
An **already-withdrawn** payout cannot be reversed — no provider reversal API is
integrated. That portion remains `amount_outstanding` and goes to manual review.
This is the behaviour §11.7 mandates (never promise guaranteed recovery), not an
unfinished edge case; see QA gap 18.8b / blueprint FIN-04.

---

## 5. Non-code deliverables (parallel track — track here for visibility)

These require Malaysian counsel / provider / Compliance, not code, but block launch:

- [ ] Malaysian legal opinion + payment-provider marketplace-flow approval (G-3, `LEG-01`).
- [ ] s.17A MACC adequate-procedures framework (T.R.U.S.T.) (G-4).
- [ ] PDPA 2024 DPO appointment/registration + breach-notification runbook (G-6).
- [ ] Contracts Act / consumer-law review of Terms, fee table, cancellation rules (G-8/G-9).
- [ ] Tax/SST treatment + invoice issuer decision (G-10).
- [ ] Written confirmation of provider AML/KYC screening scope (G-5 note).

---

## 6. Out of scope (later phases)

- Full automated target-acknowledgement mechanism (G-14) — Phase 16.
- Versioned terms acceptance table wired to transaction acceptance (G-13) — Phase 16.
- Provider-backed sanctions screening integration (stub interface lands now, real provider later).
