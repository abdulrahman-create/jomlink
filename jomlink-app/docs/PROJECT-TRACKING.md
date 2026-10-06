# Jomlink — Project Tracking Board

**Updated:** 2026-10-06 · **Build status:** ✅ `npm run build` passes · `npx tsc --noEmit` passes · `eslint` clean · `npm test` 39 passing

Single-page status view. Narrative detail lives in `00-project-plan.md` and the
per-phase docs; this file answers *"where are we, what's next, what's blocking"*
at a glance.

> **Most recent work: Phase 12** — lifecycle guards, notification deep-links,
> Linker negotiation UI, and two money-path fixes. One data issue left for manual
> resolution (⚠️ row 1 in *Known gaps*).

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

**MVP is feature-complete.** Remaining work is production hardening (below).

> ⚠️ **Phase 12 left one data issue unresolved by design** — a stale **RM 2,200
> escrow on an RM 1,500 opportunity**, on a `COMPLETED` connection, created before
> the reward-commit fix. It needs a product decision. See
> `phase-12-lifecycle-guards-and-money-path.md` → *Known unresolved data*.

---

## Outstanding migrations

**None.** Phase 11 needed no schema change — the database was already correct;
the bugs were in how the app addressed it.

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

## Known gaps & follow-ups

Ordered by risk to the pilot, not by effort.

| # | Item | Severity | Notes |
|---|------|----------|-------|
| 1 | **Stale escrow: RM2,200 on an RM1,500 opportunity** | 🔴 **Urgent** | Connection `255a7894-afa2-4474-9c67-123e001746d2` is `COMPLETED` and will release **RM2,200** to the Linker; the opportunity's reward is **RM1,500**. Created by the pre-Phase-12 reward bug (escrow took the Linker's opening ask). The fix stops new occurrences but does not correct this row. Needs a product decision. |
| 2 | **Extension is unilateral** | 🟠 High | A Linker self-approves an extension, which also **auto-clears their own yellow flag** and pushes their escrow release date. The extension does nothing to constrain the party it is meant to hold accountable. Consider Linker-requests / Seeker-approves, mirroring the deadline flow. |
| 3 | Notification delivery is **in-app only** | 🟡 Medium | `notification_channel` supports EMAIL/SMS/PUSH; no worker sends them. Members must open the app to learn anything. |
| 4 | Live payment gateway | 🟡 Medium | ToyyibPay is sandbox-only; production keys + webhook tunnel still needed. |
| 5 | **Match score trusts self-declared relationships** | 🟡 Medium | A member can claim any relationship and collect up to 26 points. `relationship_verifications` exists in Prisma for exactly this and is unbuilt. Scoring is a signal, not a gate. |
| 6 | KYC hardening | 🟡 Medium | Status + badge + document upload + admin review exist. No liveness/selfie check, no document expiry, no automated provider. |
| 7 | Test coverage is **pure logic only** | 🟡 Medium | Phase 12 added `vitest` + 39 tests for `status.ts` and `notification-links.ts`. No DB/action/integration coverage, so the bug class that needs a request context (missing action guards, wrong value reaching escrow) is still only catchable by using the app. |
| 8 | No admin evidence queue | ⚪ Low | Only needed if evidence moderation is actually wanted. Would require an `evidence:write` permission, an `/admin/evidence` page and a review action. The `approved` column is reserved for this. |
| 9 | Fraud / risk scoring | ⚪ Low | Repeated yellow flags are already recorded and can feed an engine. |
| 10 | Business accounts, multi-country, multi-currency | ⚪ Low | Architecture-ready, not built. |

---

## Recurring bug patterns (worth watching)

Phase 10 documented the first shape; Phase 11 added a second.

**Shape 1 — the UI offers what the backend never reaches.**
Four of the five bugs fixed in Phase 10 were invisible in code review and only
appeared by **using the app**: the UI offered a state the backend never reached,
or an action at the wrong point in the lifecycle, and the server had no guard.

| Instance | UI offered | Reality |
|----------|-----------|---------|
| `[id]` back-link → `/dashboard` | A "parent" that skips a level | Hierarchy was dashboard → list → detail |
| Extension form on `COMPLETED` | An action on a closed job | No status guard in the action |
| Review form after reviewing | A form that always errors | Server rejected, UI never checked |
| Evidence "Pending review" | A verdict that would arrive | No code path ever set `approved` |

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
  (`src/lib/*.test.ts`) — currently the lifecycle predicates and the notification
  link resolver. When you add or change a shared rule, extend it: the tests that
  matter are the ones that fail when a rule is duplicated or reverted.
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
- **Money-moving actions check funds in the action, before writing state.**
  The wallet check is not a UI concern; disabling a button is convenience only.
  Commit the *negotiated* figure (`agreed_reward ?? last counter-offer ??
  proposed_reward`), never the Linker's opening ask.
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
