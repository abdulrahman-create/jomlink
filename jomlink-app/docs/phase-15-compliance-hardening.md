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
- [ ] Server rejects `create`/`publish`/`edit`/`approve` for a disabled category with a
      clear error and **no** deposit charge.
- [ ] `INVESTOR_CONNECTION` is blocked with the same rigour as government.
- [ ] Unit test: posting a disabled category is rejected (add to `src/lib/*.test.ts`).
- [ ] Audit event written on any attempted blocked post.
- [ ] `tsc --noEmit`, `npm run build`, `npm test` all pass.

---

## 2. AML / KYC-before-payout gate (G-5, `LEG-04/05`)

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
- [ ] `markPayoutPaidAction` refuses unverified recipients and blocked screens.
- [ ] Screening result recorded to `audit_logs` with list version + reviewer.
- [ ] Unit test: unverified recipient payout is rejected.
- [ ] `tsc`, build, tests pass.

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
