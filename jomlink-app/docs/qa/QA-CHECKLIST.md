# Jomlink — Manual QA Checklist

**Purpose:** a single, repeatable script for exercising **every user-facing
function** of the Jomlink platform so bugs are found by *running the flow*, not
by waiting for a report.

**Baseline:** verified **2026-10-26** against Blueprint **v1.2** and
`PROJECT-TRACKING.md` (Phase 14 built, Phase 15 planned).

**How to use this file**

1. Work top to bottom. Each section is self-contained — you can run just one.
2. Mark every row: `PASS` · `FAIL` · `BLOCKED` · `SKIP` · `N/A`.
3. On a `FAIL`, always capture: **route/URL**, **role logged in**, **steps**,
   **expected vs actual**, **screenshot**, **browser console errors**, **server
   log line**. File it against the `BUG-…` ID at the bottom.
4. Never mark `PASS` on a flow you could not fully complete. `BLOCKED` is honest.

> **Last run — 2026-10-26 (static + live audit).** Scope: every route, server
> action, API route and public page was read against the rows below, and the
> public/payment surfaces were exercised in a running dev server. Results are
> recorded in the `Result` column as `✅ (static)` (verified by reading the code
> path — no DB write was made), `✅ (live)` (exercised in the browser / over
> HTTP), `❌ FAIL (BUG-00x)` (defect filed and — where marked — fixed in this
> run), or `⏸` (needs seeded data / a real payment gateway; **not** verified).
> Rows still blank are simply not done yet. **A green `tsc`/`lint`/`test`/`build`
> run is NOT evidence a row passes — only the row-level mark is.**
>
> **Baseline after the 2026-10-26 fixes:** `npx tsc --noEmit` clean ·
> `npm run lint` clean (0/0) · `npm test` **161 passing / 12 files** (was 88/6, then
> 119/9, 135/10 and 153/11 as each section was closed) · `npm run build` **44 routes**.

**Legend:** 🟥 critical money/compliance path · 🟨 role/guard boundary · ⬜ normal
· 🎨 UI/UX (visual/copy quality) · 🔌 API/RPC (non-page surface)

**Sections:**
`0` pre-flight + blueprint gap matrix · `1` auth · `2` profile · `3` KYC ·
`4` marketplace · `5` proposals · `6` money · `7` connection lifecycle ·
`8` disputes · `9` deadlines/appointments · `10` notifications ·
`11` admin/RBAC · **`12` cross-cutting security** · **`13` UI/UX & design system** ·
**`14` public pages & copy accuracy** · **`15` business profile & role** ·
**`16` API & cron endpoint security** · `17` regression suite · `18` known gaps ·
`19` bug log · `20` sign-off

---

## 0. Pre-flight (do this once per test session)

| # | Setup step | Expected | Result | Notes |
|---|-----------|----------|--------|-------|
| 0.1 | Confirm DB migrations applied | See *Required migrations* below — **all must be applied** | | |
| 0.2 | `npx tsc --noEmit` | No output (clean) — ✅ verified 2026-10-26 | | |
| 0.3 | `npm test` | **161 passing / 12 files** (Phase 14 baseline was 88/6) — ✅ verified 2026-10-26 | | |
| 0.4 | `npm run build` | Build succeeds, **44 routes** — ✅ verified 2026-10-26 | | |
| 0.5 | `npm run lint` | **0 errors, 0 warnings** — ✅ verified 2026-10-26 | | |
| 0.6 | Restart Supabase/PostgREST after any migration | Schema cache reloaded, no `PGRST` errors | | |
| 0.7 | Seed test data | ≥2 Seeker accounts, ≥2 Linker accounts, 1 admin per role | | |
| 0.8 | Wallet balance on test Seekers | ≥ RM 1,000 (RM100 floor to post + full reward to accept a Linker) | | |
| 0.9 | Confirm `RECONCILE_SECRET` is set in the test env | Sweep routes return **401** without the header (see §16) | | |
| 0.10 | Hard-refresh after deploy | No stale CSS — `backdrop-blur`/`/20` translucent sections render | | |
| 0.11 | 🔴 Deny-list is code-driven, not DB-driven | Post under `GOVERNMENT_PUBLIC_SECTOR` / `INVESTOR_CONNECTION` | Rejected before any charge. Note: re-enabling a category requires a code change to `DISABLED_CATEGORY_VALUES` (see §18.2) | |
| 0.12 | 🔴 Payout test accounts are KYC-verified | Check `member_profiles.verified_badge` for the Linker/Seeker used for withdrawals | `true` + `verification_status = VERIFIED`, else **every** withdrawal is blocked by the AML gate (§11.9.2 rule 2) — that is correct behaviour, not a bug | |
| 0.13 | 🧪 **KYC dev bypass (dev/test only)** | Set `KYC_DEV_BYPASS=true` in `.env.local` and restart the dev server → `/dashboard/kyc` → “Verify me (dev)” | Account becomes verified without a document. **Must be impossible in production** — see 3.38/3.39. Unset the flag when you want real KYC behaviour | |

### Required migrations — all three must be applied

| Migration | Needed for | Verified applied? |
|---|---|---|
| `supabase/phase-12-extension-approval.sql` | Extension request/approval flow | |
| `supabase/phase-payout-request.sql` | Bank withdrawal requests (`WITHDRAWAL` txn type, `users.bank_*`) | |
| `supabase/phase-14-verification-gated-release.sql` | Verification-gated escrow release (enum values + 9 `connections` cols) | |
| `supabase/fix-kyc-document-visibility.sql` | **NEW** — admin KYC document viewing (`kyc_records.document_path`) | |
| `supabase/phase-15-clawback.sql` | **NEW** — post-release clawback (`clawbacks` table, `CLAWBACK` dispute outcome + transaction type) | |
| `supabase/phase-15-aml-screening.sql` | **NEW** — AML screening state on `payouts` (`screen_risk`, `screen_codes`, `screen_list_version`, `screened_at`, `cleared_by/at`, `clearance_note`) | |

> ⚠️ If a migration is missing, the corresponding section will error. Record the
> error, mark the section `BLOCKED`, and note the missing migration.

### Test accounts to prepare

| Role | Purpose | Credentials (fill in) |
|---|---|---|
| Seeker (`role=SEEKER`) | posts opportunities, funds escrow | |
| Linker (`role=LINKER`) | submits proposals, earns | |
| Member `BOTH` | both sides of a connection | |
| Admin `SUPER_ADMIN` | full access | |
| Admin `KYC` | KYC only | |
| Admin `FINANCE` | payouts only | |
| Admin `OPERATIONS` | moderate only (no finance/kyc:write) | |
| **Suspended** member | guard testing | |

### Blueprint v1.2 → implementation traceability

The blueprint is **v1.2 (15 Oct 2026)**, which promoted three of its sections to
**launch blockers**. Phase 15 ("Compliance Hardening") is **planned but NOT BUILT**, so
the following are **expected-fail** — record them, do **not** treat them as new bugs.

| Blueprint § | Requirement | Implementation status | QA row |
|---|---|---|---|
| §3.9 / §11.4 | 10% posting deposit, RM10 listing fee **inside** it, RM100 reward floor | ✅ Built (`FEES`, `chargePostingDeposit`) | 4.2–4.4, 4.9–4.10 |
| §3.10 | Listing frozen once **any** proposal exists | ✅ Built | 4.6–4.7, 5.12 |
| §5.6.1 | Linker proposes deadline → Seeker accepts; yellow flag on miss | ✅ Built | 9.1–9.5, 7.16–7.17 |
| §5.6.2 | Progress thread; comment edits keep full revision history and only can edit within 15 minutes after comment only | ✅ **Built** — thread, immutable revision history, and a **15-minute edit window** enforced server-side (`PROGRESS.COMMENT_EDIT_WINDOW_MINUTES`, `lib/progress-window.ts`) | 7.15, 7.28 |
| §5.7 | Seeker **confirms** → platform **verifies** → platform **releases** | ✅ Built (Phase 14) | 7.1–7.12 |
| §5.12.1 | Anti-collusion: risk score, high-risk hold, clawback | ✅ **Built** — risk score, `HIGH_RISK_HOLD`, and a **post-release clawback recovery workflow** (`clawbacks` table, `lib/clawback.ts`, §11.7-compliant: never negative, never over-recovered, shortfall → manual review) | 7.6, 7.24, 7.30 |
| §11.9.1 | **Category deny-list, server-side, default-deny** | ✅ **BUILT** — `DISABLED_CATEGORY_VALUES` + `lib/category-policy.ts` (`checkCategoryPostable`, default-deny); enforced in create/publish/edit **before** `chargePostingDeposit` and in admin approve; disabled categories removed from the post/edit forms and the marketplace filter; every refused attempt audited as `OPPORTUNITY_CATEGORY_BLOCKED` | 11.7, 11.7b, 11.7c, 4.17, 4.20 |
| §11.9.2 | AML/sanctions/PEP screen + **KYC-before-payout** | ✅ **BUILT** — `lib/screening.ts` (`screenPayout`) runs before any ledger movement: KYC-before-payout is a hard `BLOCKED`, sanctions/PEP matches are `BLOCKED`, single-transaction / cumulative / rapid-top-up signals are a `REVIEW` hold a Compliance admin must clear (`compliance:write`, `PAYOUT_COMPLIANCE_CLEARED`). Every screen is recorded (`PAYOUT_SCREEN_RECORDED`). **Caveat:** no sanctions **provider** is integrated — the screen uses a local deny-list and records `providerConfigured: false`. A **dev/test KYC bypass** (`KYC_DEV_BYPASS`, impossible in production) lets you exercise the payout flows without approving KYC per account | 6.19, 6.20, 11.17, 3.38 |
| §11.11 | Biometric **purge job** + separate training consent | 🔴 **NOT BUILT** — `purge_requested_at` is flag-only | 3.36, 3.37 |
| §11.5 | Single state machine; holds outrank timeouts | ✅ Built (VERIFIED + `release_hold_until` + sweeps) | 7.24, 7.29 |
| §11.6 | Multiple-Linker allocations isolated; single winner | ⚠️ **Partial** — no atomic single-winner guard | 5.13 |
| §11.10 | Versioned terms acceptance per transaction | 🔴 **NOT BUILT** (Phase 16) | 5.14 |

> **Rule:** if a Phase 15 item starts working during a test run, **raise it with the
> team** — it means undocumented code has landed. Do not silently flip it to `PASS`.

---

## 1. Authentication & Registration — `src/app/actions/auth.ts`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1.1 | Register new member | `/register`, valid email + strong password | Account created, logged in, redirected to dashboard | |
| 1.2 | Register duplicate email | Same email again | Friendly error, no account created | |
| 1.3 | Register weak password | e.g. `123` | Rejected with password rule message | |
| 1.4 | Register invalid email | `not-an-email` | Rejected, no crash | |
| 1.5 | Login valid | `/login` correct creds | Session created, lands on dashboard | |
| 1.6 | Login wrong password | Any wrong password | "Invalid credentials", no user enumeration leak | |
| 1.7 | Logout | Click logout | Session cleared, protected routes redirect to `/login` | |
| 1.8 | 🟨 Access `/dashboard` logged out | Visit directly | Redirected to `/login`, **no data leaked** | |
| 1.9 | 🟨 Access `/admin` as Seeker | Visit directly | 403 / redirect — **never renders admin data** | |
| 1.10 | Session persistence | Refresh mid-flow | Still logged in | |

---

## 2. Member Profile — `src/app/actions/profile.ts` · `/dashboard/profile`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 2.1 | View own profile | `/dashboard/profile` | All fields render, no `undefined`/`null` strings | |
| 2.2 | Edit profile → save | Change name, bio, company | Persists, success toast, values reload correctly | |
| 2.3 | Validation | Blank required field / oversized text | Inline error, save blocked | |
| 2.4 | Public profile | `/members/[id]` | Only public fields; **no email/phone leak** | |
| 2.5 | Own public view | `/members/<own-id>` | Shows public projection, not an error | |
| 2.6 | Verification badge | Profile with `verified_badge=true` | Badge visible; absent when false | |
| 2.7 | Avatar/photo upload | Upload valid image | Renders; oversized/invalid type rejected | |

---

## 3. 🔴 KYC — Identity Verification

### 3a. Member submission — `src/app/actions/kyc.ts` · `/dashboard/kyc`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.1 | Submit KYC document | Select `NATIONAL_ID`, ref `1234`, upload a PDF | Success; record appears as `PENDING` | |
| 3.2 | Submit without file | Omit attachment | "Please attach an identity document." | |
| 3.3 | Wrong file type | Upload `.exe` / `.docx` | "Only JPEG, PNG, WebP or PDF documents are allowed." | |
| 3.4 | Oversized file | Upload > 10 MB | "Document must be 10 MB or smaller." | |
| 3.5 | No document type | Submit without type | "Please select a document type." | |
| 3.6 | Re-submission after reject | Submit a new doc | New `PENDING` record created; history retained | |
| 3.7 | Own record list | Reload `/dashboard/kyc` | Member sees own submissions + statuses only | |
| 3.8 | 🟨 Member cannot open admin URL | Request `/api/admin/kyc/<id>/document` as member | **401/403 — no document served** | |

### 3b. 🔴 Admin review — `/admin/kyc` · route `api/admin/kyc/[id]/document`

> **Regression focus (recently fixed — re-test every release):**
> - *Admin could not see submitted documents* → `document_path` now persisted & signed.
> - *Approve/Reject buttons showed on `REJECTED` records* → terminal states now show plain text.

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.9 | Admin sees queue | Login as `KYC` admin → `/admin/kyc` | PENDING records listed with member name + email | |
| 3.10 | 🔴 **View document** (with ref) | Click "View document" on a record **that has a reference** | Signed URL opens the **actual uploaded file** — not a 500 | |
| 3.11 | 🔴 **View document** (no ref) | Click on a record **with blank reference** | "View document" **is still shown** and opens the file | |
| 3.12 | 🔴 File is the right file | Compare opened doc to what member uploaded | Exact same file/extension | |
| 3.13 | Signed URL expiry | Wait > 60s, reuse URL | Expired — access denied | |
| 3.14 | Approve a PENDING record | Click Approve | Status → `VERIFIED`; member profile `verified_badge=true`; member notified | |
| 3.15 | Reject a PENDING record | Click Reject | Status → `REJECTED`; `verified_badge=false`; member notified with reason | |
| 3.16 | 🔴 **No buttons after reject** | Reload page on the `REJECTED` row | **"Rejected" text — NO Approve/Reject buttons** | |
| 3.17 | 🔴 **No buttons after approve** | Reload on `VERIFIED` row | **"Approved" text — no buttons** | |
| 3.18 | 🔴 Replay a stale verdict | Re-POST `reviewKycAction` for an already-settled id | Server no-ops; verdict **not flipped** | |
| 3.19 | Filter tab counts | Compare tab labels | Counts match rows in each tab | |
| 3.20 | 🟨 `OPERATIONS` admin (no `kyc:write`) | Review a record | No action buttons; sees `—`; cannot submit review | |
| 3.21 | 🟨 Non-admin hits API | Request `/api/admin/kyc/<id>/document` as Seeker | 401/403 | |
| 3.22 | KYC audit log | `/admin/audit-logs` after 3.14 | `KYC_APPROVED` entry with admin email | |

### 3c. Relationships tab (same page) — `/admin/kyc?tab=relationships`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.23 | Verify a relationship | Click Verify | → `VERIFIED` badge | |
| 3.24 | 🔴 **No buttons after reject** | Reject, then reload | **"Rejected" text — NO Verify/Reject buttons** | |
| 3.25 | Member declares relationship | `/dashboard/relationships` add one | Appears in admin queue as pending | |
| 3.26 | Visibility respected | Set `PUBLIC` vs `PLATFORM_ONLY` | Public one shows on member profile; platform-only does not | |

### 3d. Biometric dataset — `/admin/kyc?tab=biometrics`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 3.27 | Consent required | Submit biometric without ticking consent | Blocked with consent message | |
| 3.28 | Submit selfie + ID | Provide both images | Row created, `UNLABELLED`, consent version recorded | |
| 3.29 | Label a pair | Set label `MATCH` | Stats update; `labelled_by`/`labelled_at` set | |
| 3.30 | View biometric asset | `/api/admin/kyc/biometrics/<id>?asset=selfie` and `?asset=id` | Signed URL opens correct private image | |
| 3.31 | 🟨 Non-`kyc:read` admin | Open biometric route | 403 | |
| 3.32 | Missing asset | Request with no `selfie_path` | 404 "Asset missing" | |
| 3.33 | Member withdraws consent | `withdrawBiometricConsentAction` | Consent false, recorded | |
| 3.34 | Member wipe request | `wipeBiometricDataAction` | Files purged from bucket, rows cleared | |
| 3.35 | Graceful degrade | Rename/remove table (or simulate) | Banner shows, **page still loads** other tabs | |
| 3.36 | 🔴 **Purge job exists** | Look for a biometric purge cron route | ⚠️ **Known gap** (§11.11, PRIV-01): `purge_requested_at` rows are **flagged but never deleted**. Expected-fail | |
| 3.38 | 🧪 **Dev/test verify shortcut** | With `KYC_DEV_BYPASS=true` (not production) → `/dashboard/kyc` | A “Dev / test mode” card offers **Verify me (dev)**; clicking it sets `verified_badge=true` + `verification_status=VERIFIED` and writes `KYC_DEV_VERIFIED` to the audit log | ✅ **BUILT 2026-10-26** — `lib/kyc-dev-bypass.ts` + `devVerifySelfKycAction`; card hidden unless the server confirms the bypass is available |
| 3.39 | 🔴 **Bypass is impossible in production** | Deploy with `NODE_ENV=production` **and** `KYC_DEV_BYPASS=true` | Card does not render; the action does **nothing**; withdrawals are still gated; `devVerifySelfKycAction` logs a refusal | ✅ **BUILT 2026-10-26** — `kycDevBypassState()` returns `PRODUCTION_BLOCKED` before it ever reads the flag; pinned by 8 unit tests in `kyc-dev-bypass.test.ts` |
| 3.37 | 🔴 Separated training consent | Review the biometric consent checkbox | ⚠️ **Known gap**: single bundled KYC consent; model-training has **no separate** consent (§11.11). Expected-fail | |

---

## 4. Opportunity Marketplace

### 4a. Create / edit — `src/app/actions/opportunities.ts` · `/opportunities/new`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 4.1 | Create valid opportunity | Reward RM 500, category, deadline | `PENDING_PAYMENT` → after deposit `ACTIVE` | |
| 4.2 | 🟥 Deposit auto-deducted | Reward RM 500 | Exactly **RM 50** (10%) deducted from wallet | |
| 4.3 | 🟥 Below minimum reward | Reward RM 50 | Blocked (min is **RM 100**) | |
| 4.4 | 🟥 Insufficient balance | Reward > 10× wallet | Blocked with clear message; nothing debited | |
| 4.5 | Missing required fields | Submit blank | Inline validation | |
| 4.6 | Edit own draft | `/opportunities/[id]/edit` | Saves; deposit recalculated if reward changed | |
| 4.7 | 🟨 Edit another's opportunity | Craft URL for someone else's id | **Forbidden** | |
| 4.8 | Confidentiality level | Set `RESTRICTED` / `PRIVATE_DIRECT` | Only matched/eligible users see details | |
| 4.9 | Cancel before selection | Cancel pre-selection | Deposit refunded **less RM 10** listing fee | |
| 4.10 | Cancel fee math | Reward RM 500, deposit RM 50 | Refund **RM 40**; ledger shows `LISTING_FEE` RM 10 | |
| 4.11 | Cancel after selection | Cancel post-selection | Blocked — escrow already committed | |

### 4b. Browse / match — `/marketplace`, `/opportunities/[id]`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 4.12 | Browse active only | Open marketplace | Only `ACTIVE`/open opportunities; no drafts | |
| 4.13 | Search & filter | Filter by category/status | Results match filter; empty state is clean | |
| 4.14 | Match score | View as a Linker | Score renders (0–100); no `NaN`/`undefined` | |
| 4.15 | 🟨 Closed opportunity | Open a `COMPLETED` one | No "Apply"/"Select" affordances | |
| 4.16 | Pagination / limits | Many rows | Correct slicing, nothing duplicated | |
| 4.17 | 🔴 **Restricted category surfacing** | Filter to `GOVERNMENT_PUBLIC_SECTOR` / `INVESTOR_CONNECTION` | Neither is offered in the filter; direct URL post is rejected server-side | ✅ **FIXED 2026-10-26** (BUG-009) — both are on the deny-list (`DISABLED_CATEGORY_VALUES`); the marketplace filter and both opportunity forms are built from `PUBLIC_OPPORTUNITY_CATEGORIES`, so a disabled category is not selectable (§11.9.1 rule 3) | |
| 4.18 | 🎨 Category deep-link | From landing, click a category card | Lands on `/marketplace?category=<value>` with that filter applied | ✅ (live) 2026-10-26 — cards now carry the **enum value**, not the display label (was broken: label never matched the filter) |
| 4.19 | 🎨 **Dead search box** | Landing page → type a term → click "Search Marketplace" | ⚠️ **BUG**: the landing `<form>` has no `action`, no `name` on the input and no handler → **nothing happens**. Expect this to fail until fixed | ✅ (live) **FIXED 2026-10-26** (BUG-001) — `action="/marketplace" method="get"` + `name="q"`; verified `?q=investor` lands on the marketplace with the term applied |
| 4.20 | Restricted badge on card | View a restricted listing | Warning badge + `RESTRICTED` confidentiality shown | ⏸ legacy rows only — no new restricted-category listing can be created, so this badge now only appears on rows posted before the 2026-10-26 deny-list landed |
| 4.21 | Empty filter result | Filter with no matches | Clean empty state, filters still usable | |

---

## 5. Proposals & Negotiation — `src/app/actions/proposals.ts`, `negotiations.ts`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 5.1 | Linker applies | `/opportunities/[id]/apply` | Proposal `SUBMITTED`; seeker notified | |
| 5.2 | Self-application | Apply to **own** opportunity | Blocked | |
| 5.3 | Duplicate proposal | Apply twice | Blocked / single proposal | |
| 5.4 | Counter-offer | Seeker counters | Round recorded; status → `UNDER_REVIEW`/negotiating | |
| 5.5 | Negotiation panel | `/api/proposals/[id]/negotiations` | History in order; both parties can post | |
| 5.6 | 🟨 Terminal proposal locked | Propose on `SELECTED`/`COMPLETED` proposal | **No Counter-offer / Accept** (regression: `isProposalNegotiable`) | |
| 5.7 | Accept a proposal | Accept | → `ACCEPTED` (terms agreed, not terminal) | |
| 5.8 | Select a Linker | Select | → `SELECTED`; escrow committed; others `REJECTED` | |
| 5.9 | 🟨 Select on closed opp | Try selecting after `LINKER_SELECTED` | Blocked (`OPPORTUNITY_CLOSED_FOR_SELECTION_STATUSES`) | |
| 5.10 | Withdraw proposal | Withdraw own | → `WITHDRAWN`; no further action offered | |
| 5.11 | Proposals received view | `/dashboard/proposals-received` | Seeker sees all incoming, correct statuses | |
| 5.12 | 🟨 Listing locks on first proposal | Submit a proposal, then try to edit the opportunity | Edit blocked once **any** proposal exists (§3.10) | |
| 5.13 | 🔴 Concurrent selection | Two Seeker tabs select two different Linkers at once | ⚠️ **Known gap** (§11.6): no atomic single-winner guard. Only one should win — verify and log | |
| 5.14 | Versioned terms acceptance | Accept terms as either party | ⚠️ **Known gap** (§11.10, Phase 16): no `terms_acceptances` record. Expected-fail | |
| 5.15 | 🎨 Negotiation panel UX | Open the thread | Messages in chronological order, author labels correct, composer disabled when terminal | |
| 5.16 | Optional proposed reward | Leave "Proposed reward" blank on apply | Proposal uses the Seeker's `offer_amount`; hint text shows the RM figure | |
| 5.17 | 🟥 Reward floor on negotiate | Counter `RM 50` | Rejected (RM100 minimum) server-side, not just in the form | |

---

## 6. 🔴 Transactions, Escrow & Wallet — `src/app/actions/transactions.ts`, `payouts.ts`

### 6a. Escrow commit

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 6.1 | 🔴 Escrow on select | Select Linker at RM 500 | Seeker wallet −RM 500; escrow row created | |
| 6.2 | Ledger integrity | Compare wallet vs ledger | Debits = credits = reward amount | |
| 6.3 | 🔴 Double-commit guard | Select twice / replay | Escrow committed **once** only | |
| 6.4 | Reward matches agreed | Negotiated down to RM 400 | Escrow = **RM 400**, not original | |

### 6b. Wallet top-up — `/dashboard/wallet` · ToyyibPay

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 6.5 | Min top-up | RM 10 | Accepted | |
| 6.6 | Below min | RM 5 | Blocked (`TOPUP_MIN = 10`) | |
| 6.7 | Above max | RM 50 000+ | Blocked (`TOPUP_MAX = 50000`) | |
| 6.8 | 🟥 Callback credits once | Complete payment | Wallet credited **exactly once** | |
| 6.9 | 🟥 Callback replay | Re-POST callback | **No double credit** (idempotent) | |
| 6.10 | Return URL | `/api/payments/toyyibpay/return` | Lands on wallet with correct state | |
| 6.11 | Reconcile | `/api/payments/toyyibpay/reconcile` | Pending payments settled correctly | |
| 6.12 | Failed payment | Abandon at gateway | Wallet unchanged; txn `FAILED` | |

### 6c. 🔴 Payout / withdrawal

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 6.13 | 🔴 Linker payout math | RM 500 reward released | Linker receives **RM 450**; platform fee **RM 50** (10%) | |
| 6.14 | Fee ledger row | After release | `LINKER_SERVICE_FEE` txn recorded | |
| 6.15 | Bank details saved | Add bank account | Persists (`users.bank_*` — needs migration) | |
| 6.16 | Request withdrawal | `/dashboard/wallet` | `WITHDRAWAL` txn `PENDING`; balance held | |
| 6.17 | 🟨 Over-balance withdrawal | Request > balance | Blocked | |
| 6.18 | Admin marks paid | `/admin/transactions` → `markPayoutPaidAction` | Txn → `COMPLETED`; member notified | |
| 6.19 | 🟥 No AML/KYC gate | Request payout with **no KYC** | Request refused up front with a "verify your identity" message | ✅ **BUILT 2026-10-26** (BUG-010) — `requestPayoutAction` checks `isMemberVerifiedForPayout` **before** creating any payout row; refusal audited as `PAYOUT_SCREEN_BLOCKED` (`stage: request`); the wallet panel shows the requirement and disables the button |
| 6.20 | 🟥 KYC holder gets paid | Admin marks PAID for an **unverified** member | Settlement **blocked** — no ledger movement | ✅ **BUILT 2026-10-26** (BUG-010) — `markPayoutPaidAction` screens before any ledger entry; an unverified recipient returns `BLOCKED` and `canSettlePayout` refuses **even if someone ticks an override** |
| 6.20b | 🟥 Large payout held for review | Request a payout ≥ RM 10,000 (verified member) | Held `REVIEW`; Finance cannot pay it; a Compliance admin clears it with a written rationale | ✅ **BUILT 2026-10-26** (BUG-010) — thresholds in `AML` (`PAYOUT_REVIEW_THRESHOLD`, `CUMULATIVE_PAYOUT_THRESHOLD`, `RAPID_TOPUP_WINDOW_HOURS`); `/admin/transactions?tab=requests` shows the verdict + `Clear for payment` (requires `compliance:write`, min-10-char note) |
| 6.20c | 🟥 Every screen is attributable | Pay a payout, then open `/admin/audit-logs` | A `PAYOUT_SCREEN_RECORDED` entry with party, amount, codes, list version, screening admin and timestamp | ✅ **BUILT 2026-10-26** (BUG-010) — written on every screen, whether it clears, holds or blocks (§11.9.2 rule 4). `providerConfigured: false` is recorded so the missing provider is never mistaken for a clean provider result |
| 6.21 | Pending top-up not in balance | Start a top-up, do not pay | Balance unchanged; "pending" hint shown separately | |
| 6.22 | Payout needs bank on file | Request withdrawal before saving bank | Blocked with a clear "save bank details" message | |
| 6.23 | One open withdrawal | Request twice | Second blocked — only one pending request at a time | |
| 6.24 | 🎨 Money formatting | Inspect every amount | `RM 1,000.00` style everywhere; no `NaN`, no `undefined`, no float drift | |

---

## 7. 🔴 Connection Lifecycle & Completion — `src/app/actions/completions.ts`, `evidence.ts`

> The Seeker **confirms**, the platform **verifies**, only the platform **releases**.
> Valid path: `EVIDENCE_SUBMITTED → AWAITING_SEEKER_CONFIRMATION → AWAITING_VERIFICATION → VERIFIED → RELEASED`.

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 7.1 | Acknowledge connection | Linker acks | `PENDING_ACKNOWLEDGEMENT` → `IN_PROGRESS` | |
| 7.2 | Submit evidence | `/dashboard/connections/[id]` upload | → `EVIDENCE_SUBMITTED`; evidence stored | |
| 7.3 | Evidence visible to admin | `api/evidence/[id]` | Admin can retrieve; others blocked | |
| 7.4 | Seeker confirms | Confirm evidence | → `AWAITING_SEEKER_CONFIRMATION` → `AWAITING_VERIFICATION` | |
| 7.5 | 🟨 **Seeker cannot release** | Look for a release button | **None exists** — Seeker-facing release was deleted | |
| 7.6 | 🟥 Admin verifies | `/admin/...` verify action | → `VERIFIED` | |
| 7.7 | 🟥 Release escrow | Platform releases | Escrow → Linker (net of fee); → `RELEASED`/`COMPLETED` | |
| 7.8 | 🟨 Release in wrong state | Release while `IN_PROGRESS` | Blocked (`isReleasable` fails closed) | |
| 7.9 | 🟨 Verify in wrong state | Verify while `EVIDENCE_SUBMITTED` | Blocked (`isVerifiable`) | |
| 7.10 | Seeker rejects evidence | Reject | Cure window opens (`EVIDENCE_CURE_WINDOW_DAYS = 3`) | |
| 7.11 | Linker re-submits after reject | Submit corrected evidence | Loop advances correctly | |
| 7.12 | 🟥 No double release | Release twice | Second attempt **no-ops**; money moves once | |
| 7.13 | Mark failed | Mark connection failed | → `FAILED`; no release | |
| 7.14 | 🟨 Appointment on closed connection | Schedule on `COMPLETED` | Blocked (`isConnectionOpen`) | |
| 7.15 | Progress thread | `/dashboard/connections/[id]/progress` | Posts in order; author roles correct | ✅ (static) — reports + comments hydrate in order with LINKER/SEEKER role labels |
| 7.16 | Yellow flag | Miss a commitment | Flag `RAISED`; visible to both parties | |
| 7.17 | Clear flag | Deliver late | Flag → `CLEARED` | |
| 7.23 | 🟨 **Seeker cannot verify** | Look for a verify button as Seeker | **None** — `verifyCompletionAction` is platform-only | |
| 7.24 | 🟥 High-risk hold blocks release | Trigger a HIGH risk completion | `release_hold_until` set ~7 days; **no release** until cleared (§11.5 precedence) | |
| 7.25 | Deficiency cure window | Reject with reason, Linker re-submits | Cure window = 3 days; loop advances correctly | |
| 7.26 | 🎨 Reward & payout card | View as Linker | Gross reward, **net after 10%**, and **when** it lands all shown | |
| 7.27 | 🟨 Evidence for wrong allocation | Submit evidence against another connection | Rejected server-side | |
| 7.28 | Progress comment edit history | Edit your own comment on a progress report | Previous wording preserved in **update history**; edit allowed **only within 15 minutes** of posting; after that the comment is final | ✅ **FIXED 2026-10-26** (BUG-007) — revision history already existed; the **15-minute window was missing** and is now enforced server-side + reflected in the UI. 9 unit tests (`progress-window.test.ts`) |

### 7b. Timeout sweeps (can be triggered manually)

| # | Test | Endpoint | Expected | Result |
|---|------|----------|----------|--------|
| 7.18 | Deadline sweep | `api/connections/deadline-sweep` | Overdue deadlines flagged/notified | |
| 7.19 | Release sweep | `api/connections/release-sweep` | Stale completed connections released (`RELEASE_WAIT_DAYS = 7`) | |
| 7.20 | Verification sweep | `api/connections/verification-sweep` | `AWAITING_VERIFICATION` past window auto-releases with review flag | |
| 7.21 | 🟥 Sweep idempotency | Run sweep twice | **No duplicate payouts** | |
| 7.22 | Dispute freezes escrow | Open dispute before release | Escrow frozen; sweep skips it | |
| 7.29 | 🟥 Sweep respects hold | Run verification sweep on a HIGH-risk hold | Hold wins over the 2-day timeout (§11.5 precedence) | |
| 7.30 | 🟥 **Post-release clawback** | Admin opens a clawback on a released connection (inside 7 days) → `/admin/transactions?tab=clawbacks` | Only what the wallet can cover is recovered; the rest is recorded as **outstanding** + flagged for manual review; wallet never goes negative; Linker notified; audit `CLAWBACK_OPENED` | ✅ **BUILT 2026-10-26** (BUG-008) — `clawbacks` table + `lib/clawback.ts` + `actions/clawbacks.ts` (`finance:payout`); 15 unit tests |
| 7.31 | 🟥 Clawback outside window | Open a clawback > 7 days after release | Rejected server-side | ✅ (static) — `isWithinClawbackWindow` checks release time, not creation time |
| 7.32 | 🟥 Clawback over-recovery | Request more than the net payout released | Rejected server-side (`capAmount`) | ✅ (unit) — `planClawback` refuses amount > cap |
| 7.33 | 🟥 Clawback on an unreleased connection | Attempt a clawback while escrow is still held | Rejected — use a normal dispute instead | ✅ (static) — requires `release_status === "RELEASED"` |

---

## 8. Disputes — `src/app/actions/disputes.ts` · `/admin/disputes`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 8.1 | Raise dispute | From connection | → `OPEN`; connection `DISPUTED`; escrow frozen | |
| 8.2 | Admin views detail | `/admin/disputes/[id]` | Evidence + timeline + parties render | |
| 8.3 | Update status | `updateDisputeStatusAction` | Status changes, audited | |
| 8.4 | Resolve dispute | `resolveDisputeAction` outcome `REFUNDED` | Funds returned per outcome | |
| 8.5 | 🟥 Resolve once | Resolve twice | Second no-ops; **no double refund** | |
| 8.6 | 🟨 `OPERATIONS` admin (no `disputes:resolve`) | Attempt resolve | Blocked by permission | |
| 8.7 | Resolution notifies both | After resolve | Both parties notified with outcome | |

---

## 9. Deadlines & Appointments — `src/app/actions/deadlines.ts`, `appointments.ts`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 9.1 | Request deadline extension | Linker requests | → `REQUESTED`; seeker notified | |
| 9.2 | Approve extension | Seeker approves | → `ACCEPTED`; connection deadline updated | |
| 9.3 | Reject extension | Seeker rejects | → `REJECTED`; original deadline unchanged | |
| 9.4 | Supersede | Request again after one pending | Old one `SUPERSEDED` | |
| 9.5 | 🟨 Extension on closed connection | Request on `COMPLETED` | Blocked | |
| 9.6 | Propose appointment | Linker proposes | → `PROPOSED`; notified | |
| 9.7 | Acknowledge appointment | Other party acks | → `ACKNOWLEDGED` | |
| 9.8 | Confirm appointment | Confirm | → `SCHEDULED`; both notified | |
| 9.9 | Cancel appointment | Cancel | → `CANCELLED`; both notified | |
| 9.10 | 🟨 Appointment on closed connection | Schedule on `COMPLETED` | **Blocked** (Phase 13 guard) | |
| 9.11 | Deadline warning notifications | Approaching deadline | Warning fires once, not repeatedly | |

---

## 10. Notifications — `src/app/actions/notifications.ts` · `/dashboard/notifications`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 10.1 | Notification appears | Trigger any event | Row appears for the right user **only** | |
| 10.2 | Deep link works | Click notification | Lands on the **correct** entity page | |
| 10.3 | 🔴 No cross-user leak | User A's notification | User B **never** receives it | |
| 10.4 | Mark read | Click / mark read | Unread count decreases | |
| 10.5 | Unread badge | Header bell | Count matches unread rows | |
| 10.6 | Empty state | New user | Clean "no notifications" | |

**Deep-link spot-checks** (each must resolve to a working page):

| Event | Expected destination | Result |
|---|---|---|
| Proposal received | `/opportunities/[id]/proposals` | |
| Proposal accepted | `/dashboard/connections/[id]` | |
| KYC approved/rejected | `/dashboard/kyc` | |
| Evidence submitted | `/dashboard/connections/[id]` | |
| Payout paid | `/dashboard/wallet` | |
| Dispute opened | `/admin/disputes/[id]` | |

---

## 11. Admin Console & RBAC — `src/app/actions/admin.ts` · `/admin/*`

### 11a. Members — `/admin/members`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 11.1 | List members | Open page | Rows render; search works | |
| 11.2 | Suspend member | `suspendMemberAction` | Status suspended; user blocked from key actions | |
| 11.3 | 🟨 Suspended member can't act | Log in as suspended user | Cannot post/apply/withdraw | |
| 11.4 | Reinstate member | `reinstateMemberAction` | Access restored | |
| 11.5 | Update role | `updateMemberRoleAction` | Role changes; permissions follow | |

### 11b. Opportunities — `/admin/opportunities`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 11.6 | Moderate | `moderateOpportunityAction` | Status flips (approve/flag) | |
| 11.7 | 🔴 Prohibited category | Post/mod apps under a denied category | Post **rejected**, admin approve **refused**, no deposit charged | ✅ **BUILT 2026-10-26** (BUG-009) — `checkCategoryPostable` in `createOpportunityAction` (both intents), `publishOpportunityAction`, `updateOpportunityAction` and `moderateOpportunityAction`; unit-tested in `category-policy.test.ts` |
| 11.7b | 🎨 Investor category parity | Attempt `INVESTOR_CONNECTION` | ⚠️ **CLOSED 2026-10-26** — investor now blocked by the same code path as government (previously unrestricted). Verified by unit test, not by UI alone | ✅ **BUILT 2026-10-26** (BUG-009) |
| 11.7c | 🟥 No deposit on blocked post | Attempt to post a blocked category | No `POSTING_DEPOSIT` transaction exists afterwards | ✅ **BUILT 2026-10-26** (BUG-009) — the guard sits **before** `chargePostingDeposit` in all four paths; no opportunity row is created either |
| 11.8 | Toggle restricted category | `toggleRestrictedCategoryAction` | Toggle persists; audit logged | |
| 11.17 | 🟥 **Payout without KYC** | `markPayoutPaidAction` on an unverified member | Refused server-side; no ledger movement; audited | ✅ **BUILT 2026-10-26** (BUG-010, §11.9.2 LEG-05) — `KYC_NOT_VERIFIED` → `BLOCKED`, never overridable from the UI | |
| 11.18 | 🟨 Admin cannot read evidence | Non-party admin opens `/api/evidence/[id]` | Only the connection's Seeker/Linker may read; admin denied or explicitly allowed — verify actual behaviour | |

### 11c. Overview / Audit / Transactions

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 11.9 | Dashboard stats | `/admin` | Counts/amounts match DB; no `NaN` | |
| 11.10 | Audit log completeness | Perform 5 varied admin actions | 5 matching entries with admin + entity ids | |
| 11.11 | Audit log filter | Filter by action/date | Correct subset | |
| 11.12 | Admin transactions | `/admin/transactions` | Ledger renders; totals reconcile | |
| 11.13 | Payout action stub | `markPayoutPaidAction` | Only `finance:payout` admins can run | |

### 11d. 🟨 Permission matrix — test EACH admin role

For each row, log in and attempt the action. **Denied actions must be blocked
server-side, not just hidden.**

| Role → | SUPER_ADMIN | OPERATIONS | KYC | FINANCE | DISPUTE | COMPLIANCE |
|---|---|---|---|---|---|---|
| View members | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Suspend member | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Moderate opportunity | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Read KYC | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Write KYC (approve)** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Read finance | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Issue payout | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Resolve dispute | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Read audit log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

| # | Test | Expected | Result |
|---|------|----------|--------|
| 11.14 | Each cell above matches | ✅ allowed, ❌ blocked | |
| 11.15 | 🟨 `*` wildcard admin (`SUPER_ADMIN`) | All allowed | |
| 11.16 | 🟨 Custom permission list | Only listed perms allowed | |

---

## 12. Cross-cutting checks (run on every page)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 12.1 | 🔴 No secret leakage in HTML | Service-role key / signed URLs never in page source | |
| 12.2 | 🔴 No IDOR | Change an `[id]` in the URL to another user's → **403/404** | |
| 12.3 | Input validation server-side | Bypass client validation via direct POST → still rejected | |
| 12.4 | XSS | Enter `<script>alert(1)</script>` in text fields | Rendered as text, not executed |
| 12.5 | SQL/NoSQL injection | `' OR 1=1 --` in search | Treated as literal text |
| 12.6 | Money as integers/cents | Inspect all amounts | No float rounding drift (e.g. 0.1+0.2) |
| 12.7 | Empty states | Every list with zero rows | Helpful copy, no crash |
| 12.8 | Loading states | Slow connection | Skeleton/spinner, no layout jump |
| 12.9 | Error boundaries | Force a server error | Friendly error page, not a stack trace |
| 12.10 | Console clean | Full pass | No React hydration/key warnings |
| 12.11 | Responsive 375px | Mobile viewport | No horizontal scroll on tables/nav |
| 12.12 | Responsive 1440px | Desktop | Layout intact |
| 12.13 | Keyboard nav | Tab through forms | All actions reachable; focus visible |
| 12.14 | `prefers-reduced-motion` | Enable OS setting | Animations reduced |
| 12.15 | Browser back after action | Use back button | No duplicate submission / stale state |
| 12.16 | Double-click submit | Rapid double-click a submit | Only **one** operation occurs |
| 12.17 | 🔴 Mass-assignment | Send extra fields to a profile/opportunity action | Unknown fields ignored; server validates an allow-list |
| 12.18 | 🔴 Object reference on actions | Re-POST a server action with another user's `id` | Rejected server-side (ownership re-checked) |
| 12.19 | 🔴 Private routes not indexed | Check `robots`/sitemap | `/dashboard`, `/admin`, `/api` are not publicly indexed |
| 12.20 | Path traversal / MIME spoof | Upload with a crafted filename and a fake extension | Rejected; stored extension derived from MIME, not filename |

---

## 13. 🎨 UI / UX & design system

> Brand: **carmine `#BF0040`** primary, cotton-candy `#F5A3AF` accent, black, `#FEFEFE`
> white. Display font is **Sora** (`.font-display`); body uses the default sans.
> Every finding here is real UX debt even when the logic behind it works —
> a `P3` is still worth logging.

### 13a. Visual system

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 13.1 | Brand colour usage | Inspect primary buttons/links | Carmine `#BF0040`; no stray default-blue or off-palette colours | |
| 13.2 | Display font | Landing + section headings | Sora renders (`.font-display`); no FOUT flash of fallback | |
| 13.3 | Typography scale | All heading levels | Consistent h1→h4 steps; no clipping on long titles | |
| 13.4 | Icons not emojis | Scan every category/pillar card | **Lucide** icons only — emojis are a regression | |
| 13.5 | Card / border / radius | Compare all cards | One radius + border treatment; no mixed conventions | |
| 13.6 | Translucency legibility | Landing sections over `PageBackground` | Text stays readable over the hero image; scrim present | |
| 13.7 | Empty states | Every list with zero rows | Helpful copy + a next action, never a bare "No data" | |
| 13.8 | Error states | Force an action failure | Inline message near the control; no raw error codes | |
| 13.9 | Loading states | Throttle to Slow 3G | Skeletons match final layout; no content jump | |
| 13.10 | Pending / disabled buttons | Submit a slow action | Button shows pending and is non-clickable | |

### 13b. Responsive & accessibility

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 13.11 | 375 px mobile | Mobile viewport, every page | No horizontal scroll; tables scroll inside their own box | |
| 13.12 | 768 px tablet | Tablet width | Grid reflows; nav usable | |
| 13.13 | 1440 px desktop | Desktop | Content max-width respected, not stretched | |
| 13.14 | Dashboard nav < `md` | Narrow the window | Sidebar hides, horizontal nav appears, every item reachable | |
| 13.15 | Keyboard-only pass | Tab through login → post → apply | Logical order, visible focus ring, no traps | |
| 13.16 | Icon-only buttons labelled | Inspect remove/edit icon buttons | `aria-label` present (e.g. "Remove business") | |
| 13.17 | Decorative icons | Inspect inline icons | `aria-hidden="true"`; not read by screen reader | |
| 13.18 | Heading hierarchy | Audit one page | Exactly one `h1`; no skipped levels | |
| 13.19 | Colour contrast | Check muted text on translucent cards | ≥ 4.5:1 body, ≥ 3:1 large — failing rows get a P2/P3 | |
| 13.20 | `prefers-reduced-motion` | Enable OS setting | Hero zoom/parallax stops; animations reduced | |
| 13.21 | Form labelling | Inspect every input | `<Label htmlFor>` bound, or `aria-label` on the input | |
| 13.22 | Focus after error | Submit an invalid form | Focus moves to the first invalid field or the error summary | |

### 13c. Money & status presentation

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 13.23 | Signed amount colours | Wallet transaction list | In = green `+`, out = red `−`, pending = amber | |
| 13.24 | Date formatting | Any date surfaced in UI | Deterministic `DD/MM/YYYY` (no hydration mismatch) | |
| 13.25 | Status badge vocabulary | Compare statuses across pages | Same label + colour for the same status everywhere | |
| 13.26 | Fee disclosure before commit | Post opportunity, accept Linker | Gross, deposit, listing fee and net all shown **before** confirming | |
| 13.27 | Long-value overflow | Very large reward / long name | Tiles wrap, no layout break (`tabular-nums` + `break-words`) | |
| 13.28 | No console/network errors | Full pass, watch Network + Console | No 500s, no failed RSC requests, no hydration errors | |

---

## 14. 🎨 Public pages & copy accuracy

> **Why this section exists:** the public pages are the only place a regulator,
> a member or counsel reads the platform's rules. If the copy contradicts the
> code, that is a **compliance finding**, not a typo. Two pages are known to be
> stale (see rows 14.5 and 14.6).

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 14.1 | Landing sections render | `/` | Hero → search → problem/solution → categories → how it works → testimonials → CTA, in order | |
| 14.2 | Landing CTAs | Click every button | "Find a connection" → `/register`; "Browse Opportunities" → `/marketplace`; "See how it works" → `/how-it-works` | |
| 14.3 | 🔴 **No fake inventory** | Categories strip on `/` | Every count is a **real** number from the DB, or clearly illustrative. Hard-coded "240+ Opportunities" with an empty marketplace is misleading | ✅ (live) **FIXED 2026-10-26** (BUG-002) — hard-coded counts removed entirely; cards now read "Browse live listings" |
| 14.4 | 🔴 Restricted categories not advertised | Categories strip on `/` | `Investor Connection` / `Government / Public Sector` are **not** promoted as browsable products while they are restricted (§11.8/§11.9) | ✅ (live) **FIXED 2026-10-26** (BUG-002) — strip now derives from `PUBLIC_OPPORTUNITY_CATEGORIES` which excludes both; verified 9 cards, neither present |
| 14.5 | 🔴 **`/how-it-works` accuracy** | Read steps 1 and 5 | Must NOT say "fund it into escrow" at posting or a "10% activation fee". Deposit is 10% at post; reward settles on **accepting a Linker** | ✅ (live) **FIXED 2026-10-26** (BUG-003) — steps 1, 3, 5 and the fees list rewritten to the deposit-at-post + confirm→verify→release model |
| 14.6 | 🔴 **`/fees` accuracy** | Read "Escrow and release" | Must describe **Seeker confirms → platform verifies → platform releases** (Phase 14). Not "released the moment you mark it complete" | ✅ (live) **FIXED 2026-10-26** (BUG-003) — "Reward settlement" + "Escrow and release" rewritten; no remaining mark-complete→paid copy |
| 14.7 | `/fees` numbers correct | Check every figure | 10% deposit, RM10 listing fee **inside**, RM100 floor, 10% service fee, 7-day safety net | |
| 14.8 | `/prohibited` clarity | Read the page | Bribery, guaranteed government outcomes, confidential data, personal-data trading all explicitly prohibited | |
| 14.9 | `/trust-safety` clarity | Read the page | Verification, escrow, disputes, audit trail described accurately | |
| 14.10 | Footer / header links | Click every nav + footer link | Zero 404s; no link to a page that does not exist | |
| 14.11 | Logged-in header | Header as a real user | Shows avatar + dashboard, not "Log in" | |
| 14.12 | Logged-out header | Header anonymous | Shows Log in / Sign up correctly | |
| 14.13 | SEO metadata | View page source on each public page | Unique `title` + `description`; no placeholder text | |
| 14.14 | Copy tone & grammar | Read all public copy | Consistent voice, no lorem ipsum, no {placeholder} leakage | ✅ (live) **FIXED 2026-10-26** (BUG-004) — footer rendered **"introducions"** on every page; corrected to "introductions" |

---

## 15. Business profile & account role — `src/app/dashboard/business/*`

> This page is **not covered** by earlier sections and is where "one member,
> multiple roles" (§1.5.1) is actually set.

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 15.1 | View business page | `/dashboard/business` | Account-role card + business list render for a fresh user | |
| 15.2 | Change account role | Select Seeker / Linker / Both → save | Persists on `users.role`; dashboard adapts | |
| 15.3 | 🔴 Role change guard | Attempt to set an invalid role | Rejected server-side (`SEEKER` / `LINKER` / `BOTH` only) | |
| 15.4 | Add business profile | Name + industry + description | Row appears; website optional | |
| 15.5 | Required-field validation | Submit with blank name | Blocked with inline message | |
| 15.6 | Business objectives | Tick several objectives | All persist and re-render checked | |
| 15.7 | Remove business | Remove a business | Row deleted; confirmation offered | |
| 15.8 | 🟨 Cannot remove another's business | Craft a request for a foreign id | Forbidden (ownership re-checked) | |
| 15.9 | Business appears in context | Create an opportunity as that business | Business context selectable / shown (§2.10) | |
| 15.10 | 🎨 Empty business state | Fresh account | Encouraging empty state with a clear "Add business" action | |

---

## 16. 🔌 API & scheduled-endpoint security

> **Why this section exists:** ~10 of the 44 routes are NOT pages. They are the
> most attackable surface (money sweeps, signed-URL signers, webhooks) and the
> current checklist never calls them directly.

### 16a. Cron / sweep routes — `x-reconcile-secret`

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 16.1 | 🔴 No header → 401 | `GET /api/connections/verification-sweep` with no header | **401** when `RECONCILE_SECRET` is set | ✅ (static + unit) — shared `requireCronAuth`; covered by `src/lib/cron-auth.test.ts` |
| 16.2 | 🔴 Wrong secret → 401 | Send `x-reconcile-secret: nope` | **401** | ✅ (static + unit) |
| 16.3 | Correct secret → 200 | Send the real secret | `{ok:true,...}`; idempotent | ✅ (static) |
| 16.4 | 🔴 `RECONCILE_SECRET` unset | Run in an env without it | Route is **open** — this is a launch blocker; log it | ✅ **FIXED 2026-10-26** (BUG-005) — now **503 in production** when unset; still open in local dev (intentional, documented). Live-confirmed: dev returns 200, prod path covered by unit test |
| 16.5 | Release sweep auth | Same tests on `/api/connections/release-sweep` | 401 without secret | |
| 16.6 | Deadline sweep auth | Same tests on `/api/connections/deadline-sweep` | 401 without secret | |
| 16.7 | Reconcile auth | Same tests on `/api/payments/toyyibpay/reconcile` | 401 without secret | |
| 16.8 | 🔴 Sweep is repeatable | Run each sweep twice in a row | Second run changes nothing (no double pay / double warn) | |

### 16b. Webhooks & signed-URL routes

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 16.9 | 🔴 ToyyibPay hash check | POST callback with a bad hash | Rejected; no credit | |
| 16.10 | 🔴 Amount/currency mismatch | Callback with the right id but wrong amount | Rejected/quarantined | |
| 16.11 | Evidence route auth | `GET /api/evidence/[id]` as a non-party | 401/403 — only the connection's two parties | |
| 16.12 | Evidence route expiry | Use an expired evidence link | Denied | |
| 16.13 | Negotiation route auth | `GET /api/proposals/[id]/negotiations` as a third party | 401/403 | |
| 16.14 | 🔴 KYC doc signer | `/api/admin/kyc/[id]/document` as each admin role | Only `kyc:read`; signed URL expires in 60s | |
| 16.15 | 🔴 Biometric signer | `/api/admin/kyc/biometrics/[id]?asset=selfie` | Only `kyc:read`; correct asset returned | |
| 16.16 | 🟨 Method tampering | `POST`/`PUT` to a GET-only route | 405, not a crash | |
| 16.17 | Response hygiene | Inspect every JSON response | No service-role key, no internal stack traces, no other users' PII | |

---

## 17. Regression suite — bugs already found & fixed

> These were real bugs. Re-run them **every release** — they must never come back.

| # | Previously broken | Re-test | Result |
|---|-------------------|---------|--------|
| 17.1 | Admin could not view submitted KYC documents (`document_ref` signed as bucket key) | 3.10, 3.11, 3.12 | |
| 17.2 | "View document" link hidden when the reference field was blank | 3.11 | |
| 17.3 | Approve/Reject buttons still shown on `REJECTED` KYC records | 3.16 | |
| 17.4 | Same button bug on the Relationships tab | 3.24 | |
| 17.5 | Stale re-POST could flip a settled KYC verdict | 3.18 | |
| 17.6 | Seeker was sole arbiter of completion AND payment (Phase 14) | 7.5, 7.18 | |
| 17.7 | Pending top-up was counted in wallet balance | 6.21 | |
| 17.8 | Seeker "pending escrow" tile never cleared (read immutable funding rows) | 6.1, 6.21 | |
| 17.9 | Deadline extension applied unilaterally | 9.1–9.3 | |
| 17.10 | Admin "Approve" could activate without charging the deposit | 4.2 | |
| 17.11 | Landing search box submits nowhere (open — see 4.19) | 4.19 | |
| 17.12 | `/how-it-works` + `/fees` describe pre-Phase-14 release (open — see 14.5, 14.6) | 14.5, 14.6 | ✅ **Fixed 2026-10-26** (BUG-003) |
| 17.13 | Progress comment editable at any time forever (§5.6.2 has no 15-minute limit) | 7.28 | ✅ **Fixed 2026-10-26** (BUG-007) |
| 17.14 | No way to recover a released reward (§5.12.1 clawback missing entirely) | 7.30–7.33 | ✅ **Built 2026-10-26** (BUG-008) |
| 17.15 | Government **and** investor categories were postable — only flagged, never actually blocked (§11.9.1, LEG-06) | 4.17, 11.7, 11.7b, 11.7c | ✅ **Fixed 2026-10-26** (BUG-009) — server-side default-deny; 16 unit tests |
| 17.16 | A member with **no KYC at all** could request and be paid a bank withdrawal (§11.9.2, LEG-04/05) | 6.19, 6.20, 11.17 | ✅ **Fixed 2026-10-26** (BUG-010) — KYC-before-payout + screening + review thresholds; 18 unit tests |

---

## 18. Known gaps — do NOT report as new bugs

Documented and planned for **Phase 15** (`docs/phase-15-compliance-hardening.md`) or
**Phase 16**. Mark them **expected-fail**, not `FAIL`.

| # | Gap | Reference | QA row |
|---|-----|-----------|--------|
| 18.1 | ~~Payouts have no AML / KYC gate~~ — **CLOSED 2026-10-26**: KYC-before-payout (hard `BLOCKED`) + sanctions/PEP screen + transaction monitoring thresholds, enforced in `requestPayoutAction` and before every ledger movement in `markPayoutPaidAction` (`lib/screening.ts`). **Remaining limitation (18.1b):** no sanctions **provider** integrated. | `legal-compliance-gaps.md`, blueprint §11.9.2 | 6.19, 6.20, 6.20b, 6.20c, 11.17 |
| 18.1b | AML **screening provider not integrated** (§11.9.2 rule 5 — Jomlink must obtain written confirmation of the provider's screening scope). The screen applies a **local deny-list** only and records `providerConfigured: false` on every audit entry, so a "clear" result is explicitly **not** a provider sanctions clearance. KYC-before-payout and the monitoring thresholds are fully enforced and do not depend on the provider. | blueprint §11.9.2 rule 5 / LEG-04 | 6.20c |
| 18.2 | ~~Government & investor categories are flagged, not server-side denied~~ — **CLOSED 2026-10-26**: server-side deny-list built (`DISABLED_CATEGORY_VALUES`, `lib/category-policy.ts`), default-deny, enforced at create/publish/edit/admin-approve before any deposit, audited as `OPPORTUNITY_CATEGORY_BLOCKED`. Remaining limitation: enablement is a **code constant**, not yet a versioned DB-backed Compliance decision (§11.9.1 rule 4 — risk owner/expiry/approver). | blueprint §11.9.1 | 4.17, 11.7, 11.7b, 11.7c |
| 18.3 | Biometric purge job not implemented | `phase-15-compliance-hardening.md` | 3.36 |
| 18.4 | Biometric training consent not separated (bundled with KYC consent) | blueprint §11.11 | 3.37 |
| 18.5 | ~~Progress-comment edit history not stored~~ — **CLOSED 2026-10-26**: revision history was already modelled (`progress_report_comment_revisions`) and verified; the missing **15-minute edit window** is now built and enforced | blueprint §5.6.2 | 7.28 |
| 18.6 | No atomic single-winner guard for concurrent selection | blueprint §11.6 | 5.13 |
| 18.7 | No versioned terms acceptance | blueprint §11.10 (Phase 16) | 5.14 |
| 18.8 | ~~No post-release clawback~~ — **CLOSED 2026-10-26**: recovery workflow built (`clawbacks`, `lib/clawback.ts`, `actions/clawbacks.ts`). See 18.8b for the remaining, *deliberate* limitation | blueprint §5.12.1 / §11.7 | 7.30 |
| 18.9 | Stale RM 2,200 escrow on an RM 1,500 opportunity | `phase-12-…md` → *Known unresolved data* | — |
| 18.8b | Clawback **cannot** reverse an already-withdrawn payout (no provider reversal API integrated). The workflow records the shortfall as outstanding and routes to manual review, exactly as §11.7 requires — it does **not** promise guaranteed recovery. Recovery from a positive wallet balance works today. | blueprint §11.7 / FIN-04 | 7.30 |
| 18.10 | Three migrations may be unapplied (pre-flight 0.1) | `PROJECT-TRACKING.md` | 0.1 |
| 18.11 | Bank payouts are admin-settled — no real transfer | `PROJECT-TRACKING.md` gap #11 | 6.18 |
| 18.12 | Sweep routes are open when `RECONCILE_SECRET` is unset | `PROJECT-TRACKING.md` | 16.4 |

---

## 19. Bug log

| ID | Date | Section | Role | Steps | Expected | Actual | Sev | Status |
|----|------|---------|------|-------|----------|--------|-----|--------|
| BUG-001 | 2026-10-26 | §4b (4.19) | anon | Landing → type term → "Search Marketplace" | Lands on `/marketplace?q=<term>` | Nothing happened — `<form>` had no `action`, input had no `name`, no handler. Search was completely dead. | P2 | ✅ **Fixed** — `action="/marketplace" method="get" role="search"` + `name="q"`; verified live |
| BUG-002 | 2026-10-26 | §14 (14.3, 14.4) | anon | View `/` categories strip | Real counts only; restricted categories not advertised | Hard-coded "240+/180+/320+ Opportunities" (fake inventory) and promoted `Investor Connection` + `Government / Public Sector` — both compliance-restricted (§11.9.1) | P1 (compliance) | ✅ **Fixed** — counts removed; strip derives from new `PUBLIC_OPPORTUNITY_CATEGORIES` in `constants.ts` |
| BUG-003 | 2026-10-26 | §14 (14.5, 14.6) | anon | Read `/how-it-works` + `/fees` | Describe deposit-at-post + confirm→verify→release | Copy said "fund it into escrow" at posting, "10% activation fee", and reward released "the moment you mark it complete" — contradicts Phase 14 and the actual code | P1 (compliance/misleading) | ✅ **Fixed** — both pages rewritten; `eslint`/`tsc` clean |
| BUG-004 | 2026-10-26 | §14 (14.14) | anon | Read the footer on any page | "Jomlink facilitates introductions" | Rendered **"introducions"** — brand typo on every page | P3 | ✅ **Fixed** — `site-footer.tsx` |
| BUG-005 | 2026-10-26 | §16 (16.4) | anon | `GET` any of the 4 sweep/reconcile routes with `RECONCILE_SECRET` unset | Not publicly callable | All four routes only checked the header **if** the env var was set → publicly callable in a misconfigured production env (money-moving sweep). Also used a non-constant-time compare. | P1 | ✅ **Fixed** — new `src/lib/cron-auth.ts` (`requireCronAuth`): 401 on mismatch, **503 in production when unset**, constant-time compare, secret never echoed; 7 new unit tests |
| BUG-006 | 2026-10-26 | §4b / §14 (4.18) | anon | Click a landing category card | Lands with that category filtered | Card href was built from the **display label** (`?category=Investor%20Connection`), but `/marketplace` filters on the **enum value** → filter never applied | P2 | ✅ **Fixed** — cards now emit the enum value from `OPPORTUNITY_CATEGORIES` |
| BUG-007 | 2026-10-26 | §7 (7.28) | Seeker / Linker | Edit your own progress comment | Editable only within 15 minutes of posting; previous version kept as history | Revision history was already modelled correctly, but **any comment could be edited at any time, forever** — §5.6.2 requires a 15-minute limit. The thread was therefore not an honest contemporaneous record: a party could rewrite their position days later. | P2 (evidence integrity) | ✅ **Fixed** — `PROGRESS.COMMENT_EDIT_WINDOW_MINUTES = 15` + pure `lib/progress-window.ts`; enforced in `editProgressCommentAction` **before** any DB write, clock measured from `created_at` so re-editing cannot extend it; UI hides Edit and explains the closure once expired; 9 unit tests |
| BUG-008 | 2026-10-26 | §7 (7.30) | Admin | Recover a reward after it was released (fake meeting discovered later) | A clawback inside 7 days that never over-draws the wallet | **No clawback existed at all.** Once released, money was unrecoverable by design — the "Seeker discovers the meeting was fake a week later" gap (§5.12.1) was wide open. `DISPUTE_WINDOW_DAYS = 7` was defined but only used for the dispute window, never for recovery. | P1 (money / compliance) | ✅ **Built** — `clawbacks` table + `text`-typed status; `lib/clawback.ts` (`planClawback`, `isWithinClawbackWindow`) enforcing §11.7 (no negative wallet, cap = net payout, shortfall → outstanding + manual review); `actions/clawbacks.ts` (`finance:payout`) open/retry/write-off; admin tab + connection-page panel; `CLAWBACK` ledger + audit actions; 15 unit tests |
| BUG-009 | 2026-10-26 | §11b / §4b (11.7, 11.7b, 11.7c, 4.17) | Seeker / Admin | Post an opportunity under `GOVERNMENT_PUBLIC_SECTOR` or `INVESTOR_CONNECTION`; also try publishing a draft, editing a listing into the category, and an admin "Approve" | Hard server-side refusal, no deposit charged, category not offered in any selector | **The deny-list did not exist.** `GOVERNMENT_PUBLIC_SECTOR` was only *flagged* (`is_restricted_category` + `RESTRICTED` confidentiality) and still postable and fundable; `INVESTOR_CONNECTION` had **no** restriction at all. Both were offered as normal options in the post form, the edit form and the marketplace `?category=` filter. Blueprint v1.2 §11.9.1 makes this a launch blocker (LEG-02/03/06) and explicitly rules that a UI flag is "not a substitute for a hard block". | P1 (compliance / launch blocker) | ✅ **Fixed** — `DISABLED_CATEGORY_VALUES` in `constants.ts` + pure `lib/category-policy.ts` (`checkCategoryPostable`, **default-deny**: unknown values are refused too); enforced in `createOpportunityAction` (draft *and* publish intents), `publishOpportunityAction`, `updateOpportunityAction` and `moderateOpportunityAction`, each **before** `chargePostingDeposit` so a blocked listing never pays; selectors (post form, edit form, marketplace filter) now derive from `PUBLIC_OPPORTUNITY_CATEGORIES`; a disabled category already on a row still stays selectable in its own editor so an unrelated edit cannot silently re-categorise it; every refusal audited as `OPPORTUNITY_CATEGORY_BLOCKED` (member attempts carry `admin_id = null` but remain attributable); error copy moves no internal vocabulary and states that no deposit was charged; 16 unit tests. **Remaining limitation** (§18.2): enablement is still a code constant rather than a versioned DB-backed Compliance decision with risk owner, approver and expiry |
| BUG-010 | 2026-10-26 | §6c / §11b (6.19, 6.20, 6.20b, 6.20c, 11.17) | Linker / Finance | Request a bank withdrawal with **no KYC**, then try to settle it as an admin | Refused at request; settlement blocked; every screen recorded | **No AML or identity gate existed on money-out.** `requestPayoutAction` only checked bank details, balance and a single-open-request rule; `markPayoutPaidAction` moved the ledger with no identity check and no screening. A member with an unverified identity could request *and be paid* client funds, and no sanctions/PEP screen or monitoring threshold existed anywhere. Blueprint v1.2 §11.9.2 rules 1–4 make all of that **enforced, not advisory** (LEG-04 / LEG-05, launch blocker). | P1 (money / compliance) | ✅ **Built** — pure `lib/screening.ts` `screenPayout()` with precedence `BLOCKED > REVIEW > CLEAR`: unverified identity and sanctions hits are `BLOCKED` and **never overridable**; single-transaction (`AML.PAYOUT_REVIEW_THRESHOLD`), cumulative/structuring and rapid top-up-then-withdraw signals are a `REVIEW` hold. Enforced in `requestPayoutAction` (early, before any row is created) and in `markPayoutPaidAction` **before any ledger movement**; `clearPayoutForPaymentAction` (`compliance:write`, mandatory ≥10-char rationale) releases a `REVIEW` hold and records who cleared it. Every screen writes `PAYOUT_SCREEN_RECORDED` with party, amount, codes, list version, screening admin and timestamp; blocks write `PAYOUT_SCREEN_BLOCKED`; clearances write `PAYOUT_COMPLIANCE_CLEARED`. Admin queue shows the verdict + clearance control; the wallet panel shows the requirement and disables the button; migration `phase-15-aml-screening.sql` adds the workflow columns. 18 unit tests. **Remaining limitation** (§18.1b): no sanctions **provider** is integrated — the screen applies a local deny-list and records `providerConfigured: false` so a "clear" result is never mistaken for a provider clearance |

**Severity guide**
- **P1 — Critical:** money wrong, data leak, auth bypass, stuck escrow, crash on a core flow.
- **P2 — Major:** a function is unusable, but no money/data loss (e.g. buttons on a settled record).
- **P3 — Minor:** cosmetic, copy, layout, non-blocking UX.

---

## 20. Test-run sign-off

| Field | Value |
|---|---|
| Tester | |
| Date | |
| Environment | local / staging / prod-like |
| Commit / build | |
| Sections run | |
| P1 found | |
| P2 found | |
| P3 found | |
| Overall verdict | ✅ Pass · ⚠️ Pass with notes · ❌ Fail |
| Notes | |
