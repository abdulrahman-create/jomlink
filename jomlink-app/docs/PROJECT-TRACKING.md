# Jomlink — Project Tracking Board

**Updated:** 2026-10-15 · **Build status:** ✅ `npm run build` passes · `npx tsc --noEmit` passes · `eslint` clean · `npm test` 67 passing

Single-page status view. Narrative detail lives in `00-project-plan.md` and the
per-phase docs; this file answers *"where are we, what's next, what's blocking"*
at a glance. For a reverse-chronological *"what happened when"*, see
[`../../CHANGELOG.md`](../../CHANGELOG.md).

> **Most recent work: Phase 14 BUILT — verification-gated escrow release (2026-10-15).**
> The Seeker no longer pays: they **confirm** the evidence, the platform
> **verifies**, and only the platform **releases** escrow
> (`EVIDENCE_SUBMITTED → AWAITING_SEEKER_CONFIRMATION → AWAITING_VERIFICATION →
> VERIFIED → RELEASED`), with timeout sweeps so no party can stall or unilaterally
> trigger payment. The Seeker-facing release action is **deleted**. Migration
> `supabase/phase-14-verification-gated-release.sql` **still needs applying**.
> `tsc` clean, `npm run build` passes, `npm test` **88 passing** (was 67).
> See `phase-14-verification-gated-release.md`.

---

## Phase status

| Phase | Focus | Status | Doc |
|-------|-------|--------|-----|
| 0 | Foundation / scaffolding | ✅ Done | — |
| Plan | Project planning documentation | ✅ Done | `00-project-plan.md` |
| 1 | DB migrate + seed + auth flow | ✅ Done | `phase-01-auth.md` |
| 2 | Member profile + relationships | ✅ Done | `phase-02-profile.md` |
| 3 | Opportunity marketplace + matching | ✅ Done | `phase-03-marketplace.md` |
| 4 | Linker proposals + negotiation | ✅ Done | `phase-04-proposals.md` |
| 5 | Transactions / escrow | ✅ Done | `phase-05-transactions.md` |
| 6 | Connection + completion + trust | ✅ Done | `phase-06-connection.md` |
| 7 | Admin / RBAC + disputes | ✅ Done | `phase-07-admin.md` |
| 8 | Dashboard + wallet + polish | ✅ Done | `phase-08-dashboard.md` |
| 9 | Deadline + progress thread + yellow flag | ✅ Done | `phase-09-deadline-progress.md` |
| 10 | Notifications + navigation + guards | ✅ Done | `phase-10-notifications-nav-guards.md` |
| 11 | Match score + relationship save + schema routing | ✅ Done | `phase-11-match-score-and-data-layer.md` |
| 12 | Lifecycle guards + notification deep-links + money path | ✅ Done | `phase-12-lifecycle-guards-and-money-path.md` |
| 13 | Appointment notifications + track records + deadline warnings | ✅ Done | `phase-13-appointments-and-deadline-warnings.md` |
| 14 | Verification-gated escrow release | ✅ Done (⚠️ migration not applied) | `phase-14-verification-gated-release.md` |
| 15 | Compliance hardening (category deny-list, AML/KYC-before-payout, biometric purge) | 🔵 Planned | `phase-15-compliance-hardening.md` |

**MVP is feature-complete.** Remaining work is production hardening (below).

> 🔴 **Legal blockers identified 2026-10-15** (see `legal-compliance-gaps.md`): the
> government and investor opportunity categories are **only flagged, not disabled** in
> code; payouts have **no AML/KYC gate**; and the biometric **purge job is missing**. The
> blueprint was updated to **v1.2** to mandate server-side category deny-list (§11.9.1) and
> AML/sanctions screening (§11.9.2). **Phase 15** is the implementation plan.

> ⚠️ **Phase 12 left one data issue unresolved by design** — a stale **RM 2,200
> escrow on an RM 1,500 opportunity**, on a `COMPLETED` connection, created before
> the reward-commit fix. It needs a product decision. See
> `phase-12-lifecycle-guards-and-money-path.md` → *Known unresolved data*.

---

## Outstanding migrations

**Three migrations are required and NOT yet applied.**

| Migration | Needed for | Status |
|-----------|-----------|--------|
| `supabase/phase-12-extension-approval.sql` | Extension request/approval flow (§5.14) |  **APPLIED** — run it in Supabase → SQL Editor |
| `supabase/phase-payout-request.sql` | Bank withdrawal requests (member bank details, `WITHDRAWAL` transaction type, payout-request columns) |
| `supabase/phase-14-verification-gated-release.sql` | Verification-gated escrow release (Phase 14 — **built; enum values + 9 `connections` columns**) | ⚠️ **NOT APPLIED** — run it in Supabase → SQL Editor |

> ⚠️ **The extension UI will error until this is applied.** The code queries
> `jomlink.connection_extensions`, which does not exist yet. PostgREST cannot run
> DDL and the Postgres port is not reachable from the dev environment, so this
> must be run by hand. The file is idempotent — safe to re-run.
>
> ⚠️ **The bank-withdrawal UI will error until `phase-payout-request.sql` is
> applied.** The wallet page reads `users.bank_*`, and the settlement writes a
> `WITHDRAWAL` transaction — both missing until the migration runs. The file is
> idempotent (all `add column if not exists` + `add value if not exists`) — safe
> to re-run. Restart the container afterwards so PostgREST reloads the schema.

Two items from earlier phases may still be un-run on an existing database:

| Migration | Needed for | Status |
|-----------|-----------|--------|
| `supabase/phase-09-deadline-progress.sql` | Deadline / progress / flag tables | ✅ Applied on the live database (those tables are reachable) |
| `connection-evidence` bucket insert (`jomlink-schema.sql` § 6d) | Evidence document upload | ⚠️ **Verify** — uploads fail until the bucket exists |

> **Schema drift (pre-existing, harmless today).** `prisma/schema.prisma` lists
> two models with **no table** in the live database: `relationship_verifications`
> and `membership`. Neither is referenced anywhere in `src/`, and neither is in
> `supabase/jomlink-schema.sql` either. Prisma is legacy reference only — the
> runtime data path is Supabase. See `phase-11-match-score-and-data-layer.md` →
> *Schema drift*.

---

## Scheduled jobs (cron-ready routes)

These routes exist and are safe to run repeatedly, but **nothing calls them yet** —
they must be wired to a scheduler (Vercel cron or a system cron) for the pilot.

| Route | Purpose | Auth | Cadence |
|-------|---------|------|---------|
| `GET /api/connections/deadline-sweep` | Warn both parties when an open connection is running out of time and the work is not complete (§5.6.1 / §5.14). New in Phase 13. | `x-reconcile-secret` header (open in local dev) | Daily |
| `GET /api/payments/toyyibpay/reconcile` | Settle wallet top-ups stuck `PENDING` | `x-reconcile-secret` header | Every ~15 min |

> The deadline-sweep emits **one warning per connection per level per run**; the
> once-daily cadence is what keeps it from nagging. If you run it more often,
> persist a `deadline_warnings(connection_id, level, sent_at)` marker for true
> idempotency (see Phase 13 *Follow-ups*).

---

## Known gaps & follow-ups

Ordered by risk to the pilot, not by effort.

| # | Item | Severity | Notes |
|---|------|----------|-------|
| 0 | ~~**Seeker is the sole arbiter of completion AND payment release**~~ | ✅ **Fixed (Phase 14)** | The Seeker-facing release action is **deleted**. The Seeker now only **confirms** (`confirmEvidenceAction`); the platform **verifies** and **releases** (`verifyCompletionCore`), with timeouts (`runVerificationSweep`) so no party can stall. **Requires `supabase/phase-14-verification-gated-release.sql` to be applied.** |
| 1 | **Stale escrow: RM2,200 on an RM1,500 opportunity** | 🔴 **Urgent** | Connection `255a7894-afa2-4474-9c67-123e001746d2` is `COMPLETED` and will release **RM2,200** to the Linker; the opportunity's reward is **RM1,500**. Created by the pre-Phase-12 reward bug (escrow took the Linker's opening ask). The fix stops new occurrences but does not correct this row. Needs a product decision. |
| 2 | **Extension flow needs its migration applied** | 🟠 High | The unilateral-extension bug is **fixed in code** (Linker requests, Seeker accepts/rejects, only acceptance moves the deadline and clears the flag). But `supabase/phase-12-extension-approval.sql` is **not yet applied**, so the extension UI will error until it is run. |
| 3 | Notification delivery is **in-app only** | 🟡 Medium | `notification_channel` supports EMAIL/SMS/PUSH; no worker sends them. Members must open the app to learn anything. The Phase 13 deadline warning is therefore only seen on next visit — email/push would strengthen it. |
| 3b | **Deadline sweep is not scheduled** | 🟡 Medium | The running-out-of-time route (`/api/connections/deadline-sweep`) exists and is idempotent per run, but no scheduler calls it. Until wired, warnings only appear via the **in-app connection banner** (which works without cron). |
| 4 | Live payment gateway | 🟡 Medium | ToyyibPay is sandbox-only; production keys + webhook tunnel still needed. |
| 5 | **Match score trusts self-declared relationships** | 🟡 Medium | A member can claim any relationship and collect up to 26 points. `relationship_verifications` exists in Prisma for exactly this and is unbuilt. Scoring is a signal, not a gate. |
| 6 | KYC hardening | 🟡 Medium | Status + badge + document upload + admin review exist. No liveness/selfie check, no document expiry, no automated provider. |
| 7 | Test coverage is **pure logic only** | 🟡 Medium | `vitest` now covers `status.ts`, `notification-links.ts`, the extension decision table and the new deadline-warning predicates — **67 tests across 5 files**. Still no DB/action/integration coverage, so the bug class that needs a request context (missing action guards, wrong value reaching escrow) is only catchable by using the app. |
| 8 | No admin evidence queue | ⚪ Low | Only needed if evidence moderation is actually wanted. Would require an `evidence:write` permission, an `/admin/evidence` page and a review action. The `approved` column is reserved for this. |
| 9 | Fraud / risk scoring | ⚪ Low | Repeated yellow flags are already recorded and can feed an engine. |
| 10 | Business accounts, multi-country, multi-currency | ⚪ Low | Architecture-ready, not built. |
| 11 | **Bank payouts are admin-settled (no real transfer)** | 🟡 Medium | A member requests a withdrawal and an admin marks it `PAID`; the ledger movement is recorded but **no money actually leaves Jomlink** — there is no bank/FPX disbursement integration (same stubbed-gateway situation as top-ups). A production pilot needs a payout API (e.g. a Malaysian disbursement provider) or a documented manual bank-transfer operating procedure. Also: no minimum withdrawal amount, no member-facing cancel of a pending request, and `payouts.method` is free text. |

---

## Recurring bug patterns (worth watching)

Phase 10 documented the first shape; Phase 11 added a second.

**Shape 1 — the UI offers what the backend never reaches.**
Four of the five bugs fixed in Phase 10 were invisible in code review and only
appeared by **using the app**: the UI offered a state the backend never reached,
or an action at the wrong point in the lifecycle, and the server had no guard.
Phase 13 added a further three instances of the same shape (appointment
notifications and the connection-list link).

| Instance | UI offered | Reality |
|----------|-----------|---------|
| `[id]` back-link → `/dashboard` | A "parent" that skips a level | Hierarchy was dashboard → list → detail |
| Extension form on `COMPLETED` | An action on a closed job | No status guard in the action |
| Review form after reviewing | A form that always errors | Server rejected, UI never checked |
| Evidence "Pending review" | A verdict that would arrive | No code path ever set `approved` |
| Appointment proposed (P13) | Nothing for the Seeker | Action wrote no notification — `revalidatePath` is not a notification |
| Appointment rejected (P13) | No action for either party | Rejected slot became "latest"; propose form gated on *no* appointment |
| Connections row (P13) | Only "View progress" | "Open connection" rendered only when `nextAction` was null |

**Shape 2 — a confident number computed from data that never arrives.**
The Phase 11 match score displayed "Good match" for members whose category
signal had **never once fired**: the enum `"BUSINESS_INTRODUCTION"` was compared
against the prose `"Finance"`, which can never substring-match. Nothing errored.

| Instance | Displayed | Reality |
|----------|-----------|---------|
| Match score band | A confident 0–100 with a label | Heaviest signal was dead code; everyone got the fallback |
| `is_restricted_category` | — | Accepted as input, never read |
| `match_score` column | — | Defined in schema, never written |

**Shape 3 — a rule duplicated instead of shared, drifting at every copy.**
Phase 12 found that *"is this still open?"* was never wrong in isolation; it was
wrong **relative to its other copies**. The authoritative version usually already
existed, and the defect was the copies that had drifted from it. This shape has
already cost the most: it produced both the wrong escrow amount and a proposal
that reached `ACCEPTED` with no funds behind it.

| Instance | Copies | Divergent | Consequence |
|----------|--------|-----------|-------------|
| Proposal negotiation open? | 5 | 4 | Live controls on finished projects |
| Connection closed? | 6 | 2 missing | Evidence submitted on completed jobs |
| Proposal reward to escrow | 2 | 2 | Wrong amount charged (RM2,200 vs RM1,500) |
| Affordability check | 2 | 1 missing | `ACCEPTED` with no escrow and no funds |
| Whose turn to counter? | 2 | 2 (both asked only "may I accept?") | Counter-offer live for the offer's author — self-bidding |
| Existing `opportunities.linker_id`? | 4 | 4 (column never existed) | Every Select failed; cancel + apply guards silently disabled |

**Rules of thumb:**
- **(a)** Check the UI's visibility condition matches the lifecycle state the
  action is valid for; **(b)** have the server enforce the same rule rather than
  trusting the UI; **(c)** confirm any state the UI *displays* is reachable
  somewhere in the codebase — searching the column/field name is the fastest proof.
- **When a value is displayed,** assert its producing branch can actually be
  taken: confirm the comparison is between like values. An enum compared to free
  text, or a column no code writes, both yield plausible output forever.
- **When an action can fail for structurally different reasons,** surface which
  one. The relationship form failed on a missing table and reported "Could not
  save the relationship."
- **Before adding a status check, search for the existing one.** Divergence, not
  absence, is the usual defect — put the predicate in `src/lib/status.ts` so the
  action and the UI cannot drift apart again.
- **A gate that answers one question is not a gate that answers its sibling.**
  Both negotiation surfaces asked *"may I accept?"* and neither asked *"may I
  counter?"*, so Counter-offer stayed live for the author of the standing offer
  and a member could out-bid themselves. When two controls share a precondition,
  derive both from one predicate (`src/lib/negotiation.ts`) rather than writing
  the condition twice.
- **A column that appears in the TypeScript type but not in the database is worse
  than a missing one.** `OpportunityRow.linker_id` was read in four places; reads
  evaluate to `undefined` and quietly disable the guard, while a *write* makes
  PostgreSQL reject the whole update and the feature dies with a generic error.
  A hand-maintained row interface is not evidence that a column exists — check
  `prisma/schema.prisma` (and remember it mirrors the live schema, it does not
  drive it). The fix here was to correct the type; that alone made the compiler
  find every remaining phantom read.
- **`ACCEPTED` and `SELECTED` are different states, and only one locks terms.**
  `acceptTermsAction` agrees terms (no money); `selectLinkerAction` agrees terms
  *and* commits escrow. Treating `ACCEPTED` as terminal stranded the flow one
  step before the money moved.
- **When a rule depends on two entities, gate on both.** A child row (`proposal`)
  is not rewritten when its parent's state (`opportunity`) advances — completing a
  connection leaves the proposal reading `Selected` or `Under review` forever.
- **Any action that moves money must check funds server-side, in the action,
  before writing state.** A UI-only check is a convenience, never a guard. The
  same applies to *which* amount is committed: the charged figure and the figure
  shown to the user must come from one source.

---

## Conventions

- **One phase at a time.** Read the phase doc before starting; mark it done in
  `00-project-plan.md` when its *Definition of Done* is met.
- **Every phase is production-build-clean** (`npm run build` passes) before moving on.
- **Run `npm test` alongside `npm run build`.** Vitest covers pure logic
  (`src/lib/*.test.ts`) — currently the lifecycle predicates (`status.ts`), the
  notification link resolver (`notification-links.ts`), the extension decision
  table (`extensions.ts`) and the deadline-warning predicates
  (`deadline-warnings.ts`) — **67 tests across 5 files**. When you add or change a
  shared rule, extend it: the tests that matter are the ones that fail when a rule
  is duplicated or reverted.
- **Do not force peer dependencies to install a tool.** `vitest@5` needs
  `@types/node@>=24` while this project pins `^20`; `vitest@^3` was chosen instead
  of `--legacy-peer-deps` or a broad type-dependency bump.
- **Never expose `SERVICE_ROLE_KEY`** to the browser. Private files are served via
  server-side signed URLs (`/api/admin/kyc/[id]/document`, `/api/evidence/[id]`).
- **Notifications are best-effort** — use `src/lib/notify.ts`; never let a
  notification failure roll back the business action.
- **Business data lives in the isolated `jomlink` schema** (not `public`); auth
  users are tagged `app='jomlink'`.
- **The `jomlink` schema is set at `createClient` time** (`src/lib/supabase/admin.ts`).
  Calling `.schema("jomlink")` afterwards **does not work** — supabase-js drops the
  REST profile headers, every query falls back to `public`, and you get
  `PGRST205`. Never reintroduce per-call `.schema()`.
- **The `app='jomlink'` column exists only on `users`.** Do not add it to other
  inserts.
- **Lifecycle rules live in `src/lib/status.ts` — never inline.** Use
  `isProposalNegotiable` / `isProposalSelectable` / `isConnectionOpen` /
  `isOpportunitySelectable` / `isOpportunityTerminal`. Actions and UI must both
  call the same predicate so they cannot drift (Phase 12).
- **Gate on both parent and child.** A completed connection does not rewrite its
  proposal rows, so a proposal can still read `Selected`/`Under review` on a
  `COMPLETED` opportunity. Check `isOpportunityTerminal` as well as the
  proposal's own status.
- **Time-pressure rules live in `src/lib/deadline-warnings.ts` — never inline.**
  Use `deadlineProximity` / `daysUntil`; the connection banner and the
  deadline-sweep route must call the same predicate so "running out of time" means
  one thing (Phase 13). The **reactive** counterpart is the yellow flag
  (`src/lib/flags.ts`, `isDeadlineMissed`) — that fires *after* a miss; this fires
  *before*.
- **Money-moving actions check funds in the action, before writing state.**
  The wallet check is not a UI concern; disabling a button is convenience only.
  Commit the *negotiated* figure (`agreed_reward ?? last counter-offer ??
  proposed_reward`), never the Linker's opening ask.
- **Appointment proposals are Linker-only** (Phase 13), but a rejected slot is
  always recoverable — the Linker may propose a new date. Never gate the propose
  form on "there is no appointment", or a rejection deadlocks the connection.
- **Privacy by design** — relationship data must never leak personal contacts.

### Inspecting the database directly

Business data is in the **`jomlink` schema**, so a plain REST call against
`public` returns a misleading `PGRST205` "table not found". Set the profile
headers:

```
GET {SUPABASE_URL}/rest/v1/{table}?select=...
Headers: apikey: {SERVICE_ROLE_KEY}
         Authorization: Bearer {SERVICE_ROLE_KEY}
         Accept-Profile: jomlink
         Content-Profile: jomlink
```

`DATABASE_URL` in `.env.local` (`localhost:5432/jomlink`) is **not** the runtime
data path — `prisma` is legacy reference only. Pointing tooling at it will appear
to succeed while reading nothing (Phase 12).

> Source of truth for the product: `../JOMLINK PLATFORM BLUEPRINT v1.md`.
