# Phase 12 — Lifecycle Guards, Notification Deep-Links & Money-Path Integrity

**Status:** ✅ Done · **Depends on:** Phase 4 (proposals/negotiation), Phase 6 (connection), Phase 10 (notifications) · **Updated:** 2026-10-06

> **Built 2026-10-06.** A live-testing pass across the Seeker and Linker accounts
> found that the "is this still open?" rule had been re-written independently in
> **at least nine places**, and that two of the accept paths could mutate state
> with no money behind them. Fixed by centralising the state machine, wiring
> notification deep-links, and putting the wallet check on both accept paths.
> `npm run build` passes, `npx tsc --noEmit` passes, `eslint` clean.
>
> **No migration required.** All changes are application code.
>
> ⚠️ **One pre-existing data issue is left unresolved by design** — see
> *Known unresolved data* at the end. It concerns escrow already committed.

---

## Goals

1. **Tell the Seeker when a Linker submits a proposal.** They were never notified.
2. **Make notifications navigable.** A notification you cannot act on is a dead end.
3. **Give the Linker a way to answer a counter-offer.** The UI existed only on the
   Seeker's page, so the Linker was notified of an offer they had no means to accept.
4. **Make "closed" mean one thing.** Five divergent status lists meant finished
   projects still offered live controls.
5. **Guard the money path.** Neither accept path reliably checked the wallet.

---

## Bugs found in live testing

### 1. Proposal submission notified nobody

**Symptom.** Reported as *"seeker dint get notification when linker submit their
proposal"*.

`submitProposalAction` (`src/app/actions/proposals.ts`) persisted the proposal and
called `revalidatePath(...)`, then returned. It never imported `@/lib/notify` and
never wrote a notification. `revalidatePath` only invalidates Next.js's cache — it
refreshes the *client*, it does not create a row.

Every comparable action already notified (`deadlines`, `disputes`, `evidence`,
`negotiations`, `progress-reports`, `completions`, `admin`). `proposals.ts` was the
sole outlier. `lib/notify.ts` even documents the rule being violated:

> *"both parties … must be told about every material event on that connection …
> Neither side should have to poll a page to discover that something moved."*

**Fix.** `notifyUser(opp.seeker_id, null, {...})` after the proposal is persisted,
with `PROPOSAL_SUBMITTED` / `PROPOSAL_RESUBMITTED`. Also added
`PROPOSAL_WITHDRAWN` to `withdrawProposalAction`, which was silent too.

The `PROPOSAL*` icon branch in `notifications/page.tsx` already existed and was
**dead code** until these types existed.

### 2. Notifications were not clickable

Notification rows rendered as static markup with a "Mark read" button and nothing
else. `data` already carried the ids (`connectionId`, `opportunityId`,
`proposalId`, `disputeId`) — nothing read them.

**Fix.** New `src/lib/notification-links.ts`:

```ts
resolveNotificationHref(notification, role): string | null
toViewerRole(role, isAdmin): ViewerRole
```

Routes are **role-relative**, because the two parties reach the same proposal
through different pages:

| Event | Linker destination | Seeker destination |
|-------|-------------------|--------------------|
| Proposal / negotiation | `/dashboard/proposals` | `/opportunities/[id]/proposals` |

All 24 notification types are mapped. Rows posting to `openNotificationAction`
mark read **and** redirect in one click. The redirect target is validated as a
same-origin relative path — without that, the client-supplied `href` would be an
open redirect.

### 3. The Linker had no negotiation UI

**Symptom.** Reported as *"counter offer dint work properly in linker panel"*.

The counter-offer form lived only in `proposal-card.tsx`, which renders under
`/opportunities/[id]/proposals` — the **Seeker's** page. The Linker's
`/dashboard/proposals` was read-only. A Seeker could counter; the Linker was
notified and had nowhere to go.

**Fix.** Extracted `src/components/negotiation-panel.tsx` (thread + counter-offer
+ accept), rendered on both surfaces. `counterOfferAction` / `acceptTermsAction`
already re-derive the caller's role server-side, so sharing the component does not
weaken authorization. Also added `canAccept` — you can no longer accept your own
standing offer.

### 4. Five divergent "closed" lists — finished projects still editable

This was the largest defect and the cause of *"already done project still can be
counter offer? it even can be selected!"*

The rule *"can this still be negotiated?"* was written inline in **five** places
that disagreed:

| Location | Considered closed | Correct? |
|----------|------------------|----------|
| `negotiations.ts:66` (action) | SELECTED, COMPLETED, REJECTED, WITHDRAWN | ✅ |
| `proposal-card.tsx:70` (UI) | COMPLETED, REJECTED, WITHDRAWN | ❌ missing SELECTED |
| `negotiation-panel.tsx` (new) | COMPLETED, REJECTED, WITHDRAWN, EXPIRED | ❌ missing SELECTED |
| `acceptTermsAction` | *(no check at all)* | ❌ |
| `selectLinkerAction` | checked the **opportunity**, never the proposal | ❌ |

**The server action was right; the UI was wrong.** `counterOfferAction` correctly
rejected a SELECTED proposal, but the UI still *rendered* the buttons.

**Root cause of the Seeker-facing half:** completing a connection **does not
rewrite the proposal rows behind it**. A proposal can still read `Selected` or
`Under review` on an opportunity that is already `COMPLETED`. Any surface gating
only on the proposal's own status therefore stays interactive on a finished project.

**Fix.** `src/lib/status.ts` is now the single authority:

```ts
isProposalNegotiable(status)      // SELECTED is terminal (escrow committed)
isProposalSelectable(status)      // SELECTED is not — recovery path preserved
isConnectionOpen(status)          // COMPLETED / FAILED / DISPUTED
isOpportunitySelectable(status)
isOpportunityTerminal(status)     // COMPLETED / DISPUTED / FAILED / EXPIRED / CANCELLED
```

**Gate on both statuses, not one.** All nine call sites now delegate here.

> **Why `SELECTED` is terminal for negotiation but not for selection:** selection
> commits the full reward from escrow (blueprint §3.9), so terms are locked. But
> the existing recovery path lets a Seeker press Select again to finish an
> interrupted handoff without double-charging escrow. Both behaviours are
> deliberate; the two predicates exist to keep them apart.

### 5. Missing connection-status guards (evidence, appointments)

The "is this connection closed?" rule had **six** copies. Four were correct;
**two were missing entirely**.

| File | Guard |
|------|-------|
| `deadlines.ts` | ✅ |
| `progress-reports.ts` | ✅ |
| `completions.ts` | ✅ |
| `reviews.ts` | ✅ |
| **`evidence.ts`** | ❌ **none** |
| **`appointments.ts`** | ❌ **none** |

A `COMPLETED` connection still rendered a live **"Submit evidence"** form directly
under the text *"The thread has ended."* Submitting it worked and notified the
Seeker. New appointments could be proposed on a finished job too.

**Fix.** Both actions now call `isConnectionOpen`; the forms are hidden when closed
and replaced with "the evidence record is final" / "the schedule is final".

### 6. The Seeker's Connections list was always empty

`/dashboard/connections` called only `getConnectionsByUser()`, which filters
`.eq("linker_id", userId)`. A Seeker is never the `linker_id`, so they saw
*"No connections yet. They appear once a Seeker selects your proposal"* — while
owning a completed connection whose detail page worked fine.

A `getConnectionsForSeeker()` query already existed but was used only by
`/dashboard`. The page now fetches both sides and de-duplicates by id.

**Also fixed:** the empty-state copy assumed the reader was a Linker; it is now
role-aware.

### 7. Escrow committed the Linker's opening ask, not the agreed reward 🔴

**The most serious defect found.** The "Select this Linker" form submitted:

```tsx
<input type="hidden" name="agreedReward" value={proposal.proposed_reward} />  // opening ask
```

It ignored negotiation entirely. On the live data, three values disagreed:

| Source | Amount |
|--------|--------|
| Negotiated offer (thread) | RM 2,100 |
| Helper text shown to the user | RM 2,100 |
| **Actually submitted to escrow** | **RM 2,200** |

Live proof this fired in production: the wallet records
`Reward escrow −RM 2,200.00` for an opportunity whose posted reward is **RM 1,500**,
because the Linker opened at RM 2,200.

**Fix.** Introduced `effectiveReward`:

```ts
proposal.agreed_reward ?? latest?.offered_reward ?? proposal.proposed_reward
```

wired to **both** the hidden input and the helper text, so the amount charged and
the amount shown can no longer disagree.

### 8. `acceptTermsAction` had no affordability check 🔴

**Symptom.** Reported as *"seeker can accept this offer even it didnt had enough
money in wallet!!"*

The action checked the **reward floor** (≥ RM 100) and never the wallet. A Seeker
holding **RM 1,030** could accept terms of **RM 2,100**: the proposal flipped to
`ACCEPTED` and `agreed_reward` was written — with **no escrow funded and no
transaction recorded**. A commitment with nothing behind it.

Two paths both say "accept", but only one had a money wall:

| Action | Affordability check | Writes ACCEPTED |
|--------|--------------------|-----------------|
| `selectLinkerAction` | ✅ yes | opens connection + escrows |
| **`acceptTermsAction`** | ❌ **none** | ✅ **yes** ← the hole |

**Fix, in two layers:**

- **Server (the real guard).** `acceptTermsAction` now verifies the Seeker's
  balance covers the agreed reward before writing. The Linker is deliberately
  exempt — they are paid, not charged.
- **UI (move the wall earlier).** The proposals page never loaded the balance, so
  it could not warn; the member only learned after clicking. It now loads
  `getWalletBalance` server-side and passes it down. Select **and** Accept are
  disabled when short, stating the gap and linking to top-up:

  ```
  You need RM 970.00 more to select this Linker.
  Selecting commits RM 2,000.00 from your wallet, but your balance is RM 1,030.00.
  [Top up wallet]
  ```

The server guard is the one that matters; the UI change only removes a dead end.

### 9. Missing authorization on the negotiations API

`GET /api/proposals/[id]/negotiations` was readable by id alone, and its own
comment admitted it:

> *"In a hardened build, authorization (Linker or Seeker) should be enforced here."*

The thread carries offered rewards and free-text messages. Now returns
401 / 403 / 404 as appropriate. This became **required** by fix #3, since the
Linker's list fetches this endpoint.

### 10. Copy promised an action that was not offered

The negotiation thread read *"Accept it to lock the terms"* even when the viewer
**authored** the standing offer and therefore had no Accept button. Now adapts:

> *"Your counterparty can accept it, or you can revise it with another counter-offer."*

---

## The pattern worth naming

Phase 10 and 11 each documented a recurring bug shape. This phase adds a third,
and it is the most expensive one so far.

**Shape 3 — a rule duplicated instead of shared, drifting at every copy.**
The lifecycle question *"is this still open?"* was never wrong in isolation; it
was wrong **relative to its other copies**. The authoritative version often
already existed, and the defect was the copies that had drifted from it.

| Rule | Copies | Divergent | Consequence |
|------|--------|-----------|-------------|
| Proposal negotiation open? | 5 | 4 | Live controls on finished projects |
| Connection closed? | 6 | 2 missing | Evidence on completed jobs |
| Proposal reward to escrow | 2 | 2 | Wrong amount charged |
| Affordability | 2 | 1 missing | Commitment with no funds |

**Rules of thumb:**
- **(a)** Before adding a status check, search for the existing one. Divergence,
  not absence, is the usual defect.
- **(b)** Put the predicate in `src/lib/status.ts` and have **both** the action and
  the UI call it, so they cannot drift apart again.
- **(c)** When a rule depends on two entities (`proposal` and `opportunity`), gate
  on both. A child row is not rewritten when its parent's state advances.
- **(d)** Any action that **moves money** must check funds server-side, in the
  action, before writing state. A UI-only check is a convenience, never a guard.
- **(e)** Surface a structurally-different failure at the point of *attempt*, not
  after: the wallet shortfall was detectable before the click.

---

## Files changed

**New**

| File | Purpose |
|------|---------|
| `src/lib/status.ts` additions | Proposal / connection / opportunity state machine (single authority) |
| `src/lib/notification-links.ts` | Notification → role-relative deep-link resolver |
| `src/components/negotiation-panel.tsx` | Shared negotiation thread + counter/accept controls |

**Modified (behavioural)**

| File | Change |
|------|--------|
| `src/app/actions/proposals.ts` | Submit + withdraw notifications |
| `src/app/actions/negotiations.ts` | Opportunity-terminal guards; affordability on accept |
| `src/app/actions/notifications.ts` | `openNotificationAction` (mark-read + safe redirect) |
| `src/app/actions/evidence.ts` | Missing connection-closed guard |
| `src/app/actions/appointments.ts` | Missing connection-closed guard |
| `src/app/actions/deadlines.ts` · `completions.ts` · `progress-reports.ts` | Delegate to shared predicate |
| `src/app/api/proposals/[id]/negotiations/route.ts` | Party-only authorization |
| `src/app/dashboard/notifications/page.tsx` | Clickable rows, read-on-click |
| `src/app/dashboard/proposals/page.tsx` | Negotiation panel for Linkers |
| `src/app/dashboard/connections/page.tsx` | Seeker connections list; role-aware empty state |
| `src/app/dashboard/connections/[id]/page.tsx` | Hide evidence/appointment forms when closed |
| `src/app/opportunities/[id]/proposals/page.tsx` | Pass opportunity status + wallet balance |
| `src/app/opportunities/[id]/proposals/proposal-card.tsx` | Effective reward, affordability, closed-state copy |

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx eslint` (changed files) | ✅ clean |
| `npm run build` | ✅ 31/31 pages |
| `npm test` | ✅ 39 tests, 2 files |
| Completed project proposals page | ✅ `buttons: []` |
| Active project proposals page | ✅ controls present, RM 2,100 in all four places |
| Seeker connections list | ✅ 1 connection visible |
| Notifications → proposal deep-link | ✅ navigates and marks read |
| Shortfall warning | ✅ Select disabled, gap stated, top-up link |
| Post-repair data check | ✅ `still ACCEPTED: []` |

**Not verified — flagged honestly:**

- The **`BOTH`-role** path in `getConnectionsByUser` + `getConnectionsForSeeker`
  de-duplication. Reasoned, not exercised: no `BOTH` test account was used.
- The **test suite covers pure logic only.** It cannot catch the class of bug that
  needs a database or a request context — including several fixed in this phase
  (missing action guards, the wrong reward reaching escrow, the empty connections
  list). Those were found by *using the app*; the suite now protects the rules
  they depend on, not the call sites themselves.

### Test suite

Added `vitest` (3.2.7) with `npm test`. 39 tests across two files:

| File | Covers |
|------|--------|
| `src/lib/status.test.ts` | All five lifecycle predicates, including the SELECTED negotiation/selection asymmetry and the deny-list behaviour on unrecognised statuses |
| `src/lib/notification-links.test.ts` | Role-relative routing for every notification family, plus malformed `data` and a same-origin assertion across all types × roles |

The suite was **verified to have teeth**: removing `"SELECTED"` from
`PROPOSAL_TERMINAL_STATUSES` — i.e. reintroducing the exact bug reported as
*"already done project still can be counter offer?"* — fails 2 tests immediately.

> **A note on `vitest@5`:** the latest major requires `@types/node >= 24`, but this
> project pins `@types/node@^20`. `vitest@^3` was chosen instead of forcing the
> install with `--legacy-peer-deps` or silently bumping a project-wide type
> dependency.

---

## Known risks

### The lifecycle predicates are deny-lists

`isProposalNegotiable`, `isConnectionOpen` and `isOpportunitySelectable` are all
implemented as `!TERMINAL.includes(status)`. Two consequences worth knowing:

1. **An unrecognised status reads as OPEN.** A status added to the schema later
   (say an `ON_HOLD`) is treated as negotiable/selectable until someone remembers
   to add it to the list. For a path that commits money, an **allow-list** would
   fail safer. Recorded in the tests, which assert the current behaviour
   explicitly rather than leaving it accidental — invert the predicates and those
   tests must be updated deliberately, not deleted.
2. **Missing values behave inconsistently, on purpose.** `isConnectionOpen(null)`
   is `false` (fail closed) but `isOpportunityTerminal(null)` is `false` too —
   which for a *terminal* predicate means "not closed", i.e. fail open. This
   asymmetry matches the original call sites: an absent opportunity status must
   not render every card as closed. It is deliberate, but it is subtle enough to
   be worth stating.

Not changed in this phase — inverting to an allow-list is a behavioural change
across nine call sites and deserves its own pass.

---

## Known unresolved data ⚠️

**Left deliberately for manual resolution — money is involved.**

### Stale escrow: RM 2,200 on an RM 1,500 opportunity

Connection `255a7894-afa2-4474-9c67-123e001746d2` (Corporate Partnership — Retail
Merchant Onboarding with Lotus's Malaysia) holds an escrow transaction of
**RM 2,200**, while the opportunity's posted reward is **RM 1,500**.

Cause: bug #7 — escrow took the Linker's opening ask (RM 2,200) instead of the
opportunity's reward or an agreed figure. The fix prevents **new** occurrences but
does not correct this row. **The connection is `COMPLETED`**, so this escrow is
scheduled to release RM 2,200 to the Linker.

**Not changed.** Correcting a live financial commitment needs an explicit product
decision (refund the difference? re-negotiate? let it stand as a goodwill
over-payment?) and the user asked to resolve it separately.

### Repaired during the session (for the record)

Two rows were corrected with explicit approval, using the service-role key against
the `jomlink` schema:

| Row | Change |
|-----|--------|
| Proposal `7bb3dcbc-0c07-4ca1-8db4-649b4893a1ad` | `ACCEPTED` → `UNDER_REVIEW`; `agreed_reward`, `agreed_deliverable`, `agreed_at` cleared. It was flipped by bug #8 with no escrow behind it. |
| Negotiation `f1721a2f-f753-4c24-9b6d-76bf03c0e566` | Deleted — a counter-offer created while testing. |

Two pre-existing SEEKER counter-offer rows were **left untouched**.

---

## Access note for future sessions

The business data lives in the **`jomlink` schema** on Supabase
(`supabase.bma-agent.my`), reached via `SUPABASE_SERVICE_ROLE_KEY`. `DATABASE_URL`
in `.env.local` points at `localhost:5432/jomlink`, which is **not** the runtime
data path (`prisma` is legacy reference only — see Phase 11).

To inspect or repair data directly, set the schema headers — querying `public`
returns a misleading `PGRST205`:

```
GET  {SUPABASE_URL}/rest/v1/{table}?select=...
Headers: apikey, Authorization: Bearer {service_role_key},
         Accept-Profile: jomlink, Content-Profile: jomlink
```

This is the same trap documented in Phase 11 § *Schema routing*, arrived at from a
different direction.
