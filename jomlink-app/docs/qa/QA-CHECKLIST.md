# Jomlink — Manual QA Checklist

**Purpose:** a single, repeatable script for exercising **every user-facing
function** of the Jomlink platform so bugs are found by *running the flow*, not
by waiting for a report.

**How to use this file**

1. Work top to bottom. Each section is self-contained — you can run just one.
2. Mark every row: `PASS` · `FAIL` · `BLOCKED` · `SKIP` · `N/A`.
3. On a `FAIL`, always capture: **route/URL**, **role logged in**, **steps**,
   **expected vs actual**, **screenshot**, **browser console errors**, **server
   log line**. File it against the `BUG-…` ID at the bottom.
4. Never mark `PASS` on a flow you could not fully complete. `BLOCKED` is honest.

**Legend:** 🟥 critical money/compliance path · 🟨 role/guard boundary · ⬜ normal

---

## 0. Pre-flight (do this once per test session)

| # | Setup step | Expected | Result | Notes |
|---|-----------|----------|--------|-------|
| 0.1 | Confirm DB migrations applied | See *Required migrations* below — **all must be applied** | | |
| 0.2 | `npx tsc --noEmit` | No output (clean) | | |
| 0.3 | `npm test` | **88 passing** (Phase 14 baseline) | | |
| 0.4 | `npm run build` | Build succeeds | | |
| 0.5 | Restart Supabase/PostgREST after any migration | Schema cache reloaded, no `PGRST` errors | | |
| 0.6 | Seed test data | ≥2 Seeker accounts, ≥2 Linker accounts, 1 admin per role | | |
| 0.7 | Wallet balance on test Seekers | ≥ RM 500 (rules need RM 100 min reward) | | |

### Required migrations — all three must be applied

| Migration | Needed for | Verified applied? |
|---|---|---|
| `supabase/phase-12-extension-approval.sql` | Extension request/approval flow | |
| `supabase/phase-payout-request.sql` | Bank withdrawal requests (`WITHDRAWAL` txn type, `users.bank_*`) | |
| `supabase/phase-14-verification-gated-release.sql` | Verification-gated escrow release (enum values + 9 `connections` cols) | |
| `supabase/fix-kyc-document-visibility.sql` | **NEW** — admin KYC document viewing (`kyc_records.document_path`) | |

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
| 6.19 | 🟥 No AML/KYC gate | Request payout with **no KYC** | ⚠️ **Known gap — Phase 15.** Currently allowed. Log as expected-fail | |

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
| 7.15 | Progress thread | `/dashboard/connections/[id]/progress` | Posts in order; author roles correct | |
| 7.16 | Yellow flag | Miss a commitment | Flag `RAISED`; visible to both parties | |
| 7.17 | Clear flag | Deliver late | Flag → `CLEARED` | |

### 7b. Timeout sweeps (can be triggered manually)

| # | Test | Endpoint | Expected | Result |
|---|------|----------|----------|--------|
| 7.18 | Deadline sweep | `api/connections/deadline-sweep` | Overdue deadlines flagged/notified | |
| 7.19 | Release sweep | `api/connections/release-sweep` | Stale completed connections released (`RELEASE_WAIT_DAYS = 7`) | |
| 7.20 | Verification sweep | `api/connections/verification-sweep` | `AWAITING_VERIFICATION` past window auto-releases with review flag | |
| 7.21 | 🟥 Sweep idempotency | Run sweep twice | **No duplicate payouts** | |
| 7.22 | Dispute freezes escrow | Open dispute before release | Escrow frozen; sweep skips it | |

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
| 11.7 | 🔴 Prohibited category | Post/mod apps under a denied category | ⚠️ **Known gap — Phase 15.** Server deny-list missing. Log as expected-fail | |
| 11.8 | Toggle restricted category | `toggleRestrictedCategoryAction` | Toggle persists; audit logged | |

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
| 12.4 | XSS | Enter `<script>alert(1)</script>` in text fields | Rendered as text, not executed | |
| 12.5 | SQL/NoSQL injection | `' OR 1=1 --` in search | Treated as literal text | |
| 12.6 | Money as integers/cents | Inspect all amounts | No float rounding drift (e.g. 0.1+0.2) | |
| 12.7 | Empty states | Every list with zero rows | Helpful copy, no crash | |
| 12.8 | Loading states | Slow connection | Skeleton/spinner, no layout jump | |
| 12.9 | Error boundaries | Force a server error | Friendly error page, not a stack trace | |
| 12.10 | Console clean | Full pass | No React hydration/key warnings | |
| 12.11 | Responsive 375px | Mobile viewport | No horizontal scroll on tables/nav | |
| 12.12 | Responsive 1440px | Desktop | Layout intact | |
| 12.13 | Keyboard nav | Tab through forms | All actions reachable; focus visible | |
| 12.14 | `prefers-reduced-motion` | Enable OS setting | Animations reduced | |
| 12.15 | Browser back after action | Use back button | No duplicate submission / stale state | |
| 12.16 | Double-click submit | Rapid double-click a submit | Only **one** operation occurs | |

---

## 13. Regression suite — bugs already found & fixed

> These were real bugs. Re-run them **every release** — they must never come back.

| # | Previously broken | Re-test | Result |
|---|-------------------|---------|--------|
| 13.1 | Admin could not view submitted KYC documents (`document_ref` signed as bucket key) | 3.10, 3.11, 3.12 | |
| 13.2 | "View document" link hidden when the reference field was blank | 3.11 | |
| 13.3 | Approve/Reject buttons still shown on `REJECTED` KYC records | 3.16 | |
| 13.4 | Same button bug on the Relationships tab | 3.24 | |
| 13.5 | Stale re-POST could flip a settled KYC verdict | 3.18 | |

---

## 14. Known gaps — do NOT report as new bugs

These are documented, planned for Phase 15 (`docs/phase-15-compliance-hardening.md`).
Mark them **expected-fail**, not `FAIL`.

| # | Gap | Reference |
|---|-----|-----------|
| 14.1 | Payouts have no AML / KYC gate | `legal-compliance-gaps.md`, blueprint §11.9.2 |
| 14.2 | Government & investor categories are flagged, not server-side denied | blueprint §11.9.1 |
| 14.3 | Biometric purge job not implemented | `phase-15-compliance-hardening.md` |
| 14.4 | Stale RM 2,200 escrow on an RM 1,500 opportunity | `phase-12-…md` → *Known unresolved data* |
| 14.5 | Three migrations may be unapplied (pre-flight 0.1) | `PROJECT-TRACKING.md` |

---

## 15. Bug log

| ID | Date | Section | Role | Steps | Expected | Actual | Sev | Status |
|----|------|---------|------|-------|----------|--------|-----|--------|
| BUG-001 | | | | | | | P1/P2/P3 | Open |
| BUG-002 | | | | | | | | |

**Severity guide**

- **P1 — Critical:** money wrong, data leak, auth bypass, stuck escrow, crash on a core flow.
- **P2 — Major:** a function is unusable, but no money/data loss (e.g. buttons on a settled record).
- **P3 — Minor:** cosmetic, copy, layout, non-blocking UX.

---

## 16. Test-run sign-off

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
