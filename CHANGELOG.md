# Changelog — Jomlink

A single reverse-chronological record of **what happened when**. Newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/). Dates are ISO
(`YYYY-MM-DD`, Asia/Kuala_Lumpur). Entries link to the detailed phase doc.

> Full narrative lives in `jomlink-app/docs/00-project-plan.md` and the per-phase
> docs. The status board is `jomlink-app/docs/PROJECT-TRACKING.md`.

---

## [Built] — 2026-10-26 · §11.11 biometric purge + separate model-training consent

Blueprint v1.2 §11.11 makes two biometric obligations **launch blockers**. Both
were missing: `purge_requested_at` was **flag-only** — nothing ever deleted the
row or the face/ID objects, so a member's deletion request was silently ignored
forever — and a single checkbox bundled identity verification with model
training, which §11.11 states explicitly is *not sufficient* for a secondary
purpose.

### Added
- `src/lib/biometric-purge.ts` (pure) — `planBiometricPurge()` decides what a run
  must delete (purge request → retention expiry → keep) and which object paths to
  remove; `isEligibleForTraining()`; `trainingConsentStatus()`.
- `src/lib/biometric-purge-job.ts` — `runBiometricPurge()`: removes the
  private-bucket objects **first**, then the rows (if storage fails the rows are
  **retained**, so the image is never orphaned with nothing pointing at it), then
  writes a `BIOMETRIC_PURGE_RUN` audit entry on **every** run — including a run
  that deleted nothing, so "we deleted nothing" is provable.
- `GET /api/admin/biometrics/purge` — cron entrypoint, same `x-reconcile-secret`
  gate as the money sweeps (401 on mismatch, 503 in production when unset).
- `BIOMETRIC_RETENTION` (`constants.ts`) — 365-day identity retention, 730-day
  training retention, 200-row batch cap. Captures past the cap are deleted even
  when nobody asked.
- `BIOMETRIC_TRAINING_CONSENT_VERSION` — the secondary-purpose consent has its
  **own** version, independent of `BIOMETRIC_CONSENT_VERSION` (now `v2`).
- `users.training_consent / _at / _version / _withdrawn_at` and
  `kyc_biometrics.training_consent_granted / _version` — per-capture purpose
  marker, so a later withdrawal cannot retroactively "consent" old captures.
- `withdrawTrainingConsentAction` — revokes **only** training; KYC images, the
  verified badge and existing captures are untouched (audited).
- `supabase/phase-15-biometric-purge-consent.sql` — idempotent migration.

### Changed
- The biometric consent step now shows **two** clearly separated blocks: identity
  verification (required) and model training (**optional, unchecked by default**).
  A consent-status panel shows both; each capture is badged
  `training-eligible` / `verification only`. The admin biometrics tab shows the
  same purpose marker.
- Withdrawing all biometric consent and wiping data are now audited
  (`BIOMETRIC_PURGE_REQUESTED`).
- The admin audit-log filter gained the biometric actions **and** every newer
  action that was missing (`PAYOUT_*`, `CLAWBACK_*`, `OPPORTUNITY_CATEGORY_BLOCKED`,
  `KYC_DEV_VERIFIED`) plus the `KYC_BIOMETRIC` entity.

### Fixed
- **The Verification page crashed** when a not-yet-migrated column was queried
  (`Runtime Error … 42703 column users.training_consent does not exist`) and the
  wipe action returned **HTTP 500** (`PGRST204 … schema cache`). `isMissingColumnError`
  now treats **both** codes as "migration missing"; the page warns, hides the
  training opt-in and marks captures verification-only instead of failing. Found
  by running the flow, not by the build. 6 tests.

### Notes
- `tsc` clean · lint 0/0 · **188 tests / 14 files** · build **45 routes**.
- ✅ Live-verified: purge route auth (200 / 401 / 401), five no-op purge runs each
  audited and filterable, the separate consent blocks render correctly at 375 px,
  the page degrades safely with the migration unapplied.
- ⏸ **Migration not yet applied** in this environment, so the deleted path is
  proven by unit tests + a sandbox E2E that ran the real planner. **Remaining
  limitation:** retention periods are code constants (not a versioned Compliance
  schedule) and KYC documents in `kyc-documents` are not covered by this job.

---

## [Added] — 2026-10-26 · Dev/test KYC bypass (`KYC_DEV_BYPASS`)

The §11.9.2 KYC-before-payout gate blocks **every** withdrawal for an unverified
member, which made the withdrawal / payout-settlement / review-threshold /
Compliance-clearance flows impractical to exercise in dev and QA.

### Added
- `src/lib/kyc-dev-bypass.ts` — a single, deliberately production-hostile switch.
  - `NODE_ENV === "production"` → `PRODUCTION_BLOCKED`, returned **before** the
    environment variable is read, so a stray `KYC_DEV_BYPASS=true` in a
    production `.env` cannot disable identity verification.
  - Outside production it still requires an explicit `KYC_DEV_BYPASS=true`
    opt-in; without it a dev session behaves exactly like production.
- `isKycSatisfiedForPayout()` in `lib/queries.ts` — the bypass-aware gate used by
  `requestPayoutAction`, `markPayoutPaidAction` and the wallet panel. The
  unbypassable `isMemberVerifiedForPayout()` is kept for reporting.
- `devVerifySelfKycAction` + a **Dev / test mode** card on `/dashboard/kyc`
  (**Verify me (dev)**). Rendered only when the server has already confirmed the
  bypass is available; the action re-checks the same guard.
- `src/lib/kyc-dev-bypass.test.ts` — 8 tests pinning that production is refused
  for every affirmative flag spelling, and that dev requires the opt-in.

### Changed
- Every screen audit entry now records `devBypass: true` when the KYC
  requirement was satisfied by the bypass, so a fake badge is never silent.
  Self-verification writes `KYC_DEV_VERIFIED` with the actor, environment and
  prior verification state.
- `.env.production.example` documents the flag as inert in production.

### Verified
`tsc --noEmit` clean · `npm run lint` 0/0 · `npm test` **161 passing / 12 files**
(was 153/11) · `npm run build` **44 routes**.

> Enable locally: `KYC_DEV_BYPASS=true` in `.env.local`, restart the dev server,
> then `/dashboard/kyc` → **Verify me (dev)**. Unset it to restore real KYC
> behaviour. Docs: `phase-15-compliance-hardening.md` §2; QA rows 0.13, 3.38, 3.39.

---


> **Compliance launch blocker (LEG-04/05) closed for the enforced controls.**
> Money can no longer leave the platform without a verified identity, and every
> payout is screened and recorded before the ledger moves.

### Fixed
- **Any member could withdraw without identity verification** (BUG-010,
  checklist 6.19, 6.20, 6.20b, 6.20c, 11.17; blueprint v1.2 §11.9.2).
  `requestPayoutAction` only checked bank details, balance and one-open-request;
  `markPayoutPaidAction` moved the ledger with **no** identity check, no
  sanctions/PEP screen and no monitoring threshold. §11.9.2 makes all of those
  *enforced, not advisory*.

### Added
- `src/lib/constants.ts` — `AML` config: `PAYOUT_REVIEW_THRESHOLD` (RM 10,000),
  `CUMULATIVE_PAYOUT_THRESHOLD` (RM 25,000 / 30 days), `RAPID_TOPUP_WINDOW_HOURS`
  (24), `LIST_VERSION`.
- `src/lib/screening.ts` — pure, shared decision module: `screenPayout()` →
  `{risk, codes, reasons, listVersion, providerConfigured}`, plus
  `canSettlePayout()`, `requiresComplianceClearance()`, `hitDenyList()`.
  Precedence **`BLOCKED` > `REVIEW` > `CLEAR`**:
  - `KYC_NOT_VERIFIED` → **BLOCKED** — never overridable (not a checkbox, not
    `SUPER_ADMIN`).
  - `SANCTIONS_HIT` → **BLOCKED** — screens the member's registered name *and*
    the **bank beneficiary name** the money actually reaches.
  - `SINGLE_TRANSACTION_THRESHOLD` / `CUMULATIVE_THRESHOLD` (structuring) /
    `RAPID_TOPUP_THEN_WITHDRAW` → **REVIEW** hold for Compliance.
- `src/lib/screening.test.ts` — 18 unit tests.
- `clearPayoutForPaymentAction` (`compliance:write`) — releases a `REVIEW` hold
  with a **mandatory** attributable rationale, re-screens first, and refuses to
  clear a `BLOCKED` payout. It does not pay; Finance still settles.
- Audit actions `PAYOUT_SCREEN_RECORDED`, `PAYOUT_SCREEN_BLOCKED`,
  `PAYOUT_COMPLIANCE_CLEARED` — every screen is attributable (party, amount,
  codes, list version, reviewer, timestamp), whether it clears, holds or blocks.
- `supabase/phase-15-aml-screening.sql` — `payouts.screen_risk`, `screen_codes`,
  `screen_list_version`, `screened_at`, `cleared_by`, `cleared_at`,
  `clearance_note` + a partial index for the Compliance queue. **Needs applying.**

### Changed
- `requestPayoutAction` refuses an unverified member **before** creating any
  payout row (no dead work queued) and audits the refusal.
- `markPayoutPaidAction` screens **before any ledger movement**.
- `/admin/transactions?tab=requests` shows the screening verdict + signal codes
  and offers `Clear for payment` to `compliance:write` admins only.
- The wallet withdrawal panel states the KYC requirement and disables the button
  when the member is unverified (the server still enforces it).

### Verified
`npx tsc --noEmit` clean · `npm run lint` 0/0 · `npm test` **153 passing / 11
files** (was 135/10) · `npm run build` **44 routes**.

### Still open (§11.9.2 rule 5)
No sanctions/PEP/adverse-media **provider** is integrated. The screen applies a
local deny-list and every audit entry records `providerConfigured: false`, so a
"clear" result is explicitly **not** a provider sanctions clearance. KYC and the
monitoring thresholds are fully enforced and do not depend on the provider.

> Docs: `jomlink-app/docs/phase-15-compliance-hardening.md` §2 marked built;
> `docs/PROJECT-TRACKING.md` and `docs/qa/QA-CHECKLIST.md` (§0, §6c, §11b, §17,
> §18, §19) updated.

---


> **Compliance launch blocker (LEG-02/03/06) closed.** Regulated categories are now
> refused by the server at every entry point instead of merely being flagged.

### Fixed
- **Government and investor categories were postable** (BUG-009, checklist 4.17,
  11.7, 11.7b, 11.7c; blueprint v1.2 §11.9 / §11.9.1). `GOVERNMENT_PUBLIC_SECTOR`
  was only *flagged* (`is_restricted_category` + `RESTRICTED` confidentiality) and
  could still be posted and funded, and `INVESTOR_CONNECTION` carried **no**
  restriction at all. §11.9.1 rules that a UI label is "not a substitute for a
  hard block", so the flag did not satisfy the requirement.

### Added
- `src/lib/constants.ts` — `DISABLED_CATEGORY_VALUES` (single source of truth);
  `PUBLIC_OPPORTUNITY_CATEGORIES` now derives from it, so selectors and the server
  rule read the same list.
- `src/lib/category-policy.ts` — pure, UI-and-server-shared policy module:
  `checkCategoryPostable()`, `isCategoryEnabled()`, `isCategoryDisabled()`.
  **Default-deny:** a category is postable only if it is a known enum member AND
  not on the deny-list, so an unknown or future value can never go live by
  accident. Returns a member-facing message that states no deposit was charged and
  never leaks internal vocabulary.
- `AUDIT_ACTIONS.OPPORTUNITY_CATEGORY_BLOCKED` — every refused attempt is written
  to `audit_logs` with category, reason code, intent and `depositCharged: false`
  (member attempts carry `admin_id = null` but stay attributable via `details.userId`).
- `src/lib/category-policy.test.ts` — 16 unit tests (deny-list membership,
  investor/government parity, default-deny, message hygiene, single-source-of-truth).

### Changed
- Deny-list enforced **before** `chargePostingDeposit` in
  `createOpportunityAction` (draft **and** publish intents),
  `publishOpportunityAction`, `updateOpportunityAction` and
  `moderateOpportunityAction` (admin approve) — a blocked listing can never be
  created and never pays a deposit (§11.9.1 rule 2).
- The post form, the edit form and the marketplace `?category=` filter are built
  from `PUBLIC_OPPORTUNITY_CATEGORIES`, so a disabled category is not offered
  (§11.9.1 rule 3). A listing already stored under a now-disabled category keeps
  its own value in *its own* editor (labelled "disabled") so an unrelated edit
  cannot silently re-categorise it.

### Verified
`npx tsc --noEmit` clean · `npm run lint` 0/0 · `npm test` **135 passing / 10
files** (was 119/9) · `npm run build` **44 routes**.

### Still open (§11.9.1 rule 4)
Enablement is a **code constant**, not yet a versioned, audited Compliance
decision stored in the database (risk owner, rationale, approver, expiry,
re-audit cadence). Removing a category currently requires a deploy.

> Docs: `jomlink-app/docs/phase-15-compliance-hardening.md` §1 marked built;
> `docs/qa/QA-CHECKLIST.md` traceability matrix, §4b, §11b, §17, §18.2 and §19
> updated.

---


> Ran `jomlink-app/docs/qa/QA-CHECKLIST.md` (v2, 20 sections) against the code and
> a live dev server. Six real defects found; all fixed and re-verified. The
> Phase 15 compliance gaps were re-confirmed as still-open (expected-fail, not
> regressions).

### Fixed
- **Landing search box was dead** (BUG-001, checklist 4.19) — `src/app/page.tsx`
  search `<form>` had no `action`, the input had no `name`, and nothing handled
  submit, so "Search Marketplace" did nothing. Now a plain
  `action="/marketplace" method="get" role="search"` form with `name="q"` —
  works without JS and lands on the marketplace with the term applied.
- **Landing advertised fake inventory and compliance-restricted categories**
  (BUG-002, 14.3/14.4) — hard-coded "240+/180+/320+ Opportunities" counts removed,
  and `Investor Connection` / `Government / Public Sector` (disabled by default
  under blueprint §11.9.1) no longer promoted. `src/lib/constants.ts` gained
  `NON_PUBLIC_CATEGORY_VALUES` + `PUBLIC_OPPORTUNITY_CATEGORIES`, and the strip
  now derives from the shared category list so it cannot drift from the form.
- **Category deep-links filtered on the wrong key** (BUG-006, 4.18) — landing
  cards built `?category=` from the display **label**, but `/marketplace` filters
  on the enum **value**, so the filter never applied. Cards now emit the value.
- **Public copy contradicted Phase 14** (BUG-003, 14.5/14.6) — `/how-it-works`
  still said "fund it into escrow" at posting with a "10% activation fee", and
  `/fees` said the reward is released "the moment you mark it complete". Both
  rewritten to the real model: 10% refundable deposit at post (RM10 listing fee
  inside), reward escrowed on accepting a Linker, then **Seeker confirms →
  platform verifies → platform releases**.
- **Cron/sweep routes were publicly callable when unauthenticated** (BUG-005,
  16.4) — the four `x-reconcile-secret` routes only checked the header *if*
  `RECONCILE_SECRET` was set, so an unconfigured production env exposed
  money-moving sweeps. New `src/lib/cron-auth.ts` (`requireCronAuth`): 401 on
  mismatch, **503 in production when the secret is unset**, constant-time
  compare, no secret echo. `cron-auth.test.ts` adds 7 tests.
- **Footer brand typo** (BUG-004) — "introducions" → "introductions" on every page.

### Changed
- `src/app/actions/negotiations.ts` — fixed a mis-indented block in
  `counterOfferAction` (behaviour unchanged).

### Fixed (follow-up, same day)
- **No way to recover a released reward** (BUG-008, checklist 7.30) — blueprint
  §5.12.1 requires a post-release clawback for the "Seeker discovers the meeting
  was fake a week later" case. `COMPLETION.DISPUTE_WINDOW_DAYS = 7` existed but
  was never wired to any recovery path, so once a reward was released it was
  unrecoverable by design. Added:
  - `supabase/phase-15-clawback.sql` (+ canonical schema) — new `jomlink.clawbacks`
    table and a `CLAWBACK` value on both `dispute_outcome` and `transaction_type`
    (with the required `alter type … add value if not exists` self-heal, GRANTs
    and schema-cache reload). **⚠️ Not yet applied.**
  - `src/lib/clawback.ts` — pure `planClawback()` / `isWithinClawbackWindow()`.
    Encodes §11.7 faithfully: never pushes a wallet negative, never recovers more
    than the net payout released for the job, and records any shortfall as
    `amount_outstanding` + `requires_manual_review` rather than claiming a
    recovery it did not achieve.
  - `src/app/actions/clawbacks.ts` — `openClawbackAction`,
    `recoverClawbackAction`, `cancelClawbackAction`, all gated on
    `finance:payout`. Recovery is a normal double-entry movement into a new
    `platform:clawback` account, audited (`CLAWBACK_OPENED` /
    `CLAWBACK_RECOVERED` / `CLAWBACK_CLOSED`), and the Linker is notified with
    the exact amount taken and the amount still outstanding.
  - UI — `Admin → Transactions → Clawbacks` tab (open, retry, write-off with a
    required reason) and an admin-only panel on the connection detail page when
    a released reward is still inside the 7-day window.
  - `src/lib/clawback.test.ts` — 15 tests.
  - Honest limitation recorded as gap **18.8b**: an already-withdrawn payout
    cannot be reversed (no provider reversal API), so that portion stays
    outstanding and goes to manual review — which is exactly what §11.7 says a
    clawback must do rather than promising guaranteed recovery.
- **Progress comments could be edited forever** (BUG-007, checklist 7.28) —
  blueprint §5.6.2 requires edits to keep full revision history *and* to be
  allowed only within 15 minutes of posting. Revision history was already
  modelled correctly (`progress_report_comment_revisions`), but the 15-minute
  limit was missing, so a party could silently rewrite their position days
  later and the thread was not an honest contemporaneous record. Added
  `PROGRESS.COMMENT_EDIT_WINDOW_MINUTES = 15` (`constants.ts`), a pure
  `src/lib/progress-window.ts` (`commentEditWindow` / `isWithinCommentEditWindow`),
  server enforcement in `editProgressCommentAction` **before** any DB write, and
  UI that hides Edit once the window closes and explains why. The clock runs
  from `created_at`, so re-editing cannot extend it. `progress-window.test.ts`
  adds 9 tests. §5.6.2 is now **Built**, not Partial.

### Verified
- `npx tsc --noEmit` clean · `npm run lint` clean (0 errors / 0 warnings) ·
  `npm test` **95 passing / 7 files** (was 88/6) · `npm run build` **44 routes**.
- Live: landing search → `/marketplace?q=investor`; category cards emit enum
  values with no fake counts and neither restricted category; `/fees` and
  `/how-it-works` free of stale pre-Phase-14 wording; the four sweep routes
  return 200 in local dev (open by design) and are covered for the production
  fail-closed path by unit tests.

### Still open (Phase 15 — expected-fail, see `docs/phase-15-compliance-hardening.md`)
AML/sanctions screen + KYC-before-payout · server-side category deny-list ·
biometric purge job · separated training consent · progress-comment edit history ·
atomic single-winner selection · versioned terms acceptance.

---

## [Built] — 2026-10-15 · Phase 14 — verification-gated escrow release

> **Built the fix for the money-path loophole specced earlier today** (see the
> `[Spec]` entry below). The Seeker no longer pays: they **confirm**, the platform
> **verifies**, and only the platform **releases** escrow.

### Added
- **`supabase/phase-14-verification-gated-release.sql`** — adds the completion
  enum values (`EVIDENCE_SUBMITTED`, `AWAITING_SEEKER_CONFIRMATION`, `VERIFIED`)
  and the completion-workflow columns on `connections` (`evidence_submitted_at`,
  `seeker_confirmed_at`, `seeker_confirmation_status`, `verification_status`,
  `verified_at`, `verification_notes`, `risk_score`, `risk_level`,
  `release_hold_until`). Idempotent. **⚠️ Not yet applied.**
- **`src/lib/verification.ts`** — pure `scoreCompletionRisk()` + `isHighRisk()`
  (metadata-based: instant evidence, first-time pair, zero progress reports,
  missing target acknowledgement). `verification.test.ts` (14 tests).
- **`src/lib/completion.ts`** — the shared `completeAndRelease()` + new
  `verifyCompletionCore()` money-path core (plain module, not `"use server"`).
- **`src/app/api/connections/verification-sweep/route.ts`** — cron entry point
  running the three timeout stages.

### Changed
- **`src/app/actions/completions.ts`** — **deleted** `markConnectionCompleteAction`
  (the Seeker-as-payer loophole). New `confirmEvidenceAction` (Seeker: confirm →
  `AWAITING_VERIFICATION` with **no money movement**, or reject → `DISPUTED` +
  escrow `HELD`) and `verifyCompletionAction` (platform-only, permission-gated).
- **`src/app/actions/evidence.ts`** — `submitEvidenceAction` now advances the
  connection to `EVIDENCE_SUBMITTED` and stamps `evidence_submitted_at`.
- **`src/app/actions/transactions.ts`** — new `runVerificationSweep()`
  (auto-advance → auto-verify → auto-release). `runAutoReleaseCheck()` remains the
  7-day fallback.
- **`src/lib/status.ts`** — allow-list predicates `isSeekerConfirmable`,
  `isVerifiable`, `isReleasable`, `isInCompletionWorkflow`; new labels/variants.
  `status.test.ts` extended (29 tests).
- **`src/lib/queries.ts`** — `listAwaitingSeekerConfirmation`,
  `listAwaitingVerification`, `listVerifiedHeld`.
- **`src/lib/jomlink-types.ts`** — `ConnectionRow` gained the 9 workflow columns.
- **`src/lib/constants.ts`** — `COMPLETION` timeout constants; new labels.
- **UI** — `dashboard/connections/[id]` is role-aware: the Seeker gets
  Confirm/Reject controls, the Linker a read-only workflow status.

### Verified
- `npx tsc --noEmit` clean · `npm run build` passes (44 routes) · `npm test`
  passes (88 tests, +25 for Phase 14) · eslint clean.

---

## [Spec] — 2026-10-15 · Verification-gated escrow release (Phase 14)

> **Loophole found in the blueprint's money path:** the Seeker is the **sole
> arbiter of both "completion" and "payment release"** — `markConnectionCompleteAction`
> is Seeker-only and calls `settleRewardRelease()` in the same action, so the
> Seeker's click *is* the payment, with no evidence gate and no platform
> verification. Enables collusion (fake completion → withdraw), free meetings
> (Seeker ghosts, Linker unpaid), and toothless disputes (release is immediate).
>
> **Fix (spec only, not yet built):** invert the model — the Seeker *confirms*,
> the platform *verifies*, and only the platform *releases* escrow. New completion
> state machine (`EVIDENCE_SUBMITTED → AWAITING_SEEKER_CONFIRMATION →
> AWAITING_VERIFICATION → VERIFIED → RELEASED`) with timeout windows so no single
> party (Seeker, Linker, or platform) can stall or unilaterally trigger payment.
>
> See `jomlink-app/docs/phase-14-verification-gated-release.md`.

### Docs
- **Blueprint §5.7** rewritten as a platform-owned, verification-gated release
  model (state machine + transition table + timeout constants); **§5.12.1
  Anti-Collusion Gates** added; §3.11 status list, §5.16/§5.17 flows, and the
  §10.2/§10.16 feature lists updated to match.
- **New** `jomlink-app/docs/phase-14-verification-gated-release.md` — the
  implementation spec (migration, code changes, risk rules, Definition of Done).
- `PROJECT-TRACKING.md` — Phase 14 added to the board; new **#0** urgent gap;
  migration row added. `00-project-plan.md` roadmap + `docs/README.md` index
  updated.

---

## [Fix] — 2026-10-15 · Escrow releases immediately on completion (Option A)

> **Bug:** completing a connection left the reward stuck in "Pending escrow".
> Completion and release were **two separate actions on two different pages**, so
> the money only moved if the Seeker found and pressed a second button. The
> blueprint's §5.16 / §5.17 flows describe a **single** "Payment Release" step, so
> this was a bug. **Fix:** the reward now releases **immediately** when the Seeker
> marks the connection complete; the 7-day window is a **fallback only**. No
> migration required. `npm test` **67 passing**.

### Changed
- **`markConnectionCompleteAction`** (`src/app/actions/completions.ts`) now
  releases the escrowed reward in the **same action** that marks the connection
  complete, and sets `release_status = "RELEASED"`. Idempotent (skips a
  connection already `RELEASED`/`REFUNDED`/`VOID`/`HELD`). If the release call
  fails, the connection still completes with `release_status = "PENDING_RELEASE"`
  so the 7-day fallback sweep recovers it — the error is logged loudly.
- **`FEES.RELEASE_WAIT_DAYS`** is now documented as the **fallback** window, not
  the payment delay.

### Added
- **`src/lib/release.ts`** — `settleRewardRelease()`, the single money-movement
  path (escrow → Linker reward, Linker → platform 10% fee, COMPLETED payout).
  Extracted from the `"use server"` action file so it is shareable without being
  its own endpoint. Used by the completion action, the legacy manual-release
  action, and the fallback sweep.

### Docs
- **Blueprint §5.7 — new "Escrow Release Model (authoritative)"** section;
  §5.12, §3.9, the Connection System feature lists, and the §5.17 flow updated to
  say completion **pays** the Linker and the 7-day window is a safety net.
- `docs/phase-05-transactions.md` (new 2026-10-15 update section),
  `docs/phase-06-connection.md`; `/fees` and `/how-it-works` copy; connection-page
  completion button ("Mark complete & release reward").

### UI
- Opportunity page: the manual "Release reward" card is now a **recovery action**
  only — hidden once the connection's `release_status` is settled.

---

## [Refinements] — 2026-10-12 · Optional proposal reward, escrow payout visibility & bank withdrawals

> Three ship-blocking gaps closed after Phase 13: Linkers are **no longer forced
> to invent a reward**, both parties can now **see what the Linker will be paid
> and when**, and members can **withdraw their wallet balance to a bank account**
> (admin-settled). ⚠️ **Requires migration** `supabase/phase-payout-request.sql` —
> **not yet applied**. `npm test` **67 passing**.

### Added
- **Bank payout requests** — both Seekers and Linkers can now request a
  withdrawal of their available wallet balance to a bank account; an admin
  settles it from `/admin/transactions?tab=requests`.
  - New member action file `src/app/actions/payouts.ts`:
    `updateBankDetailsAction` (bank name / account no / holder, validated) and
    `requestPayoutAction` (requires bank on file, amount ≤ balance, one open
    request at a time).
  - New admin action `markPayoutPaidAction` (perm `finance:payout`) in
    `src/app/actions/admin.ts` — completes the `WITHDRAWAL` transaction + ledger
    movement (`wallet:{id} → external:payout`), flips the payout row to `PAID`,
    audits `PAYOUT_PAID`, notifies the member. Idempotent on already-paid rows.
  - New wallet UI `src/app/dashboard/wallet/payout-request-panel.tsx` (bank form
    + withdraw form + pending-request state), placed **under the balance** so it
    is visible without scrolling.
  - New admin tab **Withdrawal requests** (`?tab=requests`) +
    `src/app/admin/transactions/mark-paid-button.tsx`.
- **Payout visibility for Linkers** — a new **Reward & payout** card on the
  connection page shows the reward held in escrow, the Linker's **net take-home**
  (reward − 10% service fee), and the **release state** (paid / scheduled release
  date / held by dispute / refunded / "set on completion"). The wallet gained an
  **Incoming payouts** tile (net, next release date).
- **New query helpers** in `src/lib/queries.ts`: `getPayoutById`, `updatePayout`,
  `listPendingPayoutRequestsAdmin` (joins member names + bank details),
  `updateBankDetails`.
- **New audit actions**: `PAYOUT_REQUESTED`, `PAYOUT_PAID`.
- **Schema (needs migration)**: `users.bank_name` / `bank_account_no` /
  `bank_account_name`; `payouts.requested_at` / `approved_by` / `note`; new
  `WITHDRAWAL` transaction type. See `supabase/phase-payout-request.sql`.

### Changed
- **The proposed reward is now OPTIONAL** on a Linker proposal. Leaving the
  field blank defers to the Seeker's advertised reward (`opportunity.offer_amount`)
  — the Seeker sets the reward, the Linker only overrides it with an explicit
  figure. The fallback is resolved **server-side** (blank/omitted → seeker's
  reward, then re-checked against the RM100 floor), so the stored
  `proposed_reward` is always a real number and the downstream negotiation math
  is unaffected.
- **Wallet "Withdraw to bank" relocated** — moved from the bottom of the tall
  right-hand column into the wide left column, directly beneath the Balance /
  Pending escrow tiles, removing the empty gap and the scroll-to-find problem.
- Wallet **"Payouts" list** now distinguishes **Bank withdrawal** vs **Reward
  payout** and shows paid dates; `getWalletBalance` and the wallet page treat
  `WITHDRAWAL` as an **OUT** so the balance drops after payment.

### Fixed
- Merely cosmetic in isolation, but structural: the withdrawal flow **never
  drained the wallet on request** — the debit happens only at admin settlement,
  so an un-actioned request cannot silently remove funds.

> Docs updated: `phase-04-proposals.md`, `phase-05-transactions.md`,
> `phase-08-dashboard.md`, `PROJECT-TRACKING.md`.

---

## [Phase 13] — 2026-10-12 · Appointments, track records & deadline warnings

> Appointment notifications, rejection recovery, appointment **track records**
> (member + admin dispute view), a direct "Open connection" link, and a proactive
> **running-out-of-time** deadline-warning layer. **No migration required.**
> `npm test` **67 passing**.

### Added
- **Appointment notification** to the Seeker when the Linker proposes an
  appointment (`APPOINTMENT_PROPOSED`), and to the Linker on the Seeker's
  decision (`APPOINTMENT_ACKNOWLEDGED` / `APPOINTMENT_REJECTED`).
- **Appointment track record** on the connection page — every proposed slot,
  newest first, with date · method · location, status badge, and proposed-on
  timestamp.
- **Admin dispute view** now shows the full appointment record
  (`getEvidenceOfRecord()` returns `appointments`; new "Appointment Record" card).
- **"Open connection"** button on every Connections-tab row (the row previously
  only offered the progress thread).
- **Running-out-of-time warnings** (`src/lib/deadline-warnings.ts`): warns **both
  parties** before a deadline passes while work is incomplete. In-app banner
  (URGENT = red, SOON = amber) + `DEADLINE_APPROACHING` notification.
- **Cron-ready route** `GET /api/connections/deadline-sweep` — sweeps approaching
  deadlines; de-dupes one warning per connection per level.
- **Query** `listDeadlinesApproaching(withinDays)`.
- **Tests** `src/lib/deadline-warnings.test.ts` (7 cases) + appointment routing
  cases.

### Fixed
- **Appointment proposed notified nobody** — `proposeAppointmentAction` called
  `revalidatePath` (which refreshes the client but writes no row) and never
  imported `@/lib/notify`.
- **A rejected appointment deadlocked the connection** — the rejected slot became
  the "latest", the Seeker's controls only show for `PROPOSED`, and the Linker's
  propose form only showed when there was *no* appointment. Now **Linker-only**
  proposing, but a rejection is always recoverable ("Propose new date"), with a
  guard against stacking proposals.
- **Connections tab had no direct link** to the connection detail page.

### Changed
- **Notification contrast** — dashboard unread nudge is now a solid-carmine card
  with white text (~8:1), a pulsing dot and a count pill; unread rows gained a
  4px carmine left border; the "New" badge is solid carmine.
- `APPOINTMENT_*` routes to the connection workspace; `DEADLINE_APPROACHING` maps
  to an `AlertTriangle`/warning icon.

> Phase doc: `jomlink-app/docs/phase-13-appointments-and-deadline-warnings.md`

---

## [Phase 12] — 2026-10-06 · Lifecycle guards, deep-links & money path

> ⚠️ **Requires migration** `supabase/phase-12-extension-approval.sql` — **not yet
> applied**. One stale-escrow row left for a product decision (see tracking board).

### Added
- **Centralised lifecycle state machine** in `src/lib/status.ts`
  (`isProposalNegotiable` / `isProposalSelectable` / `isConnectionOpen` /
  `isOpportunitySelectable` / `isOpportunityTerminal`) — replacing nine divergent
  inline copies.
- **Notification deep-links** (`src/lib/notification-links.ts`) — every type maps
  to a role-relative destination; clicking marks read **and** navigates.
- **Linker negotiation UI** (`src/components/negotiation-panel.tsx`) on both
  surfaces, with `canAccept` so you cannot accept your own offer.
- **Extension request/decision flow** (§5.14) — Linker requests, Seeker decides;
  new `jomlink.connection_extensions` table.
- **First test suite** — `vitest` + 49 tests (`status.ts`, `notification-links.ts`,
  extension decision table).

### Fixed
- **Escrow committed the wrong amount** — charged the Linker's opening ask
  (RM2,200) instead of the negotiated figure (RM1,500 on live data).
- **`acceptTermsAction` had no affordability check** — a commitment could be made
  with no escrow and no funds behind it.
- **Missing connection-status guards** — a `COMPLETED` connection accepted new
  evidence and appointments.
- **Seeker's connections list was always empty** (only queried `linker_id`).
- **Proposal submission notified nobody**; **notifications were not clickable**.
- **Extension was unilateral** — the Linker cleared their own yellow flag.
- **Negotiations API was unauthorized** (`GET /api/proposals/[id]/negotiations`).

### Data
- Repaired proposal `7bb3dcbc…` (reverted to `UNDER_REVIEW`) with explicit
  approval. **Left unresolved:** stale RM2,200 escrow on an RM1,500 opportunity.

> Phase doc: `jomlink-app/docs/phase-12-lifecycle-guards-and-money-path.md`

---

## [Phase 11] — 2026-10-06 · Match score, relationship save & schema routing

> **No migration required.** The database was already correct.

### Fixed
- **Relationship form would not save** — the `jomlink` schema was set via
  per-call `.schema()` (dropped by supabase-js) so **every query** hit `public`
  (`404 PGRST205`); fixed by setting `db: { schema: "jomlink" }` at construction.
  Also removed a phantom `app` column insert (that column exists only on `users`).
- **Match score** — category relevance compared an enum against free-text
  `industry`, so the heaviest signal had **never fired**; rewrote with an
  11-category map, entity-name normalisation, employment precedence, and an
  exported `MATCH_WEIGHTS`.

### Added
- **The Seeker** can now see the match score (it was Linker-only); both sides
  score identically from one code path.

> Phase doc: `jomlink-app/docs/phase-11-match-score-and-data-layer.md`

---

## [Phase 10] — 2026-10-06 · Notifications, navigation & workflow guards

### Added
- **Notification fan-out** (`src/lib/notify.ts`) — best-effort; `notify`,
  `notifyMany`, `notifyUser`, `notifyConnectionParties`.
- **Notification coverage** across admin, disputes, completions, negotiations and
  evidence (previously zero).
- **Evidence document upload** — private `connection-evidence` bucket +
  `GET /api/evidence/[id]` signed-URL redirect.

### Fixed
- **No path reached the progress thread** from the dashboard connections card.
- **Extension after completion** added days to the escrow release timer on a
  finished job.
- **Repeated reviews** — the form stayed visible; a crafted POST could rate any
  member.
- **Evidence "Pending review"** badge — no code path ever set `approved`.

> Phase doc: `jomlink-app/docs/phase-10-notifications-nav-guards.md`

---

## [Phase 9] — 2026-10-05 · Deadline, progress thread & yellow flag

### Added
- **Deadline setting** (§5.6.1) — Linker requests a timestamped task deadline;
  Seeker accepts (task → `IN_PROGRESS`) or rejects (terms reopen).
- **Yellow flag** (§5.6.1) — commitment signal raised when a Linker misses their
  own proposed deadline; does **not** release the reward; cleared on delivery or
  an accepted extension.
- **Progress report thread** (§5.6.2) — Linker posts, both parties comment, edits
  preserve prior versions as update history.
- **Admin evidence of record** — `/admin/disputes/[id]` (deadline record, flags,
  full thread with revisions).
- New tables: `opportunity_deadlines`, `progress_reports`,
  `progress_report_comments`, `progress_report_comment_revisions`, `linker_flags`.

### Fixed
- **Empty Connections tab** — a `SELECTED` proposal could have no `connections`
  row; `selectLinkerAction` made idempotent and recoverable.

> Migration `supabase/phase-09-deadline-progress.sql` (applied).
> Phase doc: `jomlink-app/docs/phase-09-deadline-progress.md`

---

## [2026-10-01] — Seeker opportunity editing

### Added
- `/opportunities/[id]/edit` + `updateOpportunityAction`.
- **Edit-lock rule:** a listing is editable only while its status allows it **and**
  no Linker has submitted a proposal; enforced in the action, the page and the
  button.

---

## [Phases 7 + 8] — 2026-09-24 · Admin/RBAC/disputes + dashboard/wallet/polish

> **MVP feature-complete.** KYC was simplified at this point (admin review only;
> no member document upload).

### Added
- Admin RBAC, disputes, dashboard, wallet (ToyyibPay sandbox), polish.
- **Member-facing KYC submission** — `/dashboard/kyc` + private `kyc-documents`
  bucket + `/admin/kyc` review queue.
- **Admin KYC document preview** — `/api/admin/kyc/[id]/document` (60s signed URL).

---

## [Phases 1–6] — 2026-09-18 · Foundation through connection & trust

### Added
- **Phase 1** — initial migration (26 tables), seed, register/login/logout
  (Supabase Auth + Prisma), `getCurrentUser()` auto-provisioning, route protection
  via `proxy.ts`.
- **Phase 2** — dashboard layout, profile edit, employment history CRUD,
  relationship declarations, business profiles + role toggle, public profile.
- **Phase 3** — opportunity marketplace + matching.
- **Phase 4** — Linker proposals + negotiation.
- **Phase 5** — transactions / escrow.
- **Phase 6** — connection workflow + completion + trust.

---

## [Phase 0 / Plan] — 2026-09-18 · Scaffold & planning

### Added
- Project plan + all phase docs (01–08); Phase 0 scaffold complete.

---

## Outstanding operational items

- ⚠️ **Migration not applied:** `supabase/phase-12-extension-approval.sql` — the
  extension UI errors until it is run.
- ⚠️ **Unresolved data:** stale RM2,200 escrow on an RM1,500 opportunity
  (connection `255a7894-afa2-4474-9c67-123e001746d2`) — needs a product decision.
- ⚠️ **Not scheduled:** `/api/connections/deadline-sweep` exists but no cron calls
  it yet (the in-app banner works without it).
- ⚠️ **Verify:** the `connection-evidence` bucket insert (`jomlink-schema.sql`
  § 6d) — uploads fail until the bucket exists.
