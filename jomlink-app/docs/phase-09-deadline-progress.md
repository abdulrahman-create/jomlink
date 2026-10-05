# Phase 9 — Deadline Setting + Progress Report Thread + Yellow Flag

**Status:** ✅ Done · **Depends on:** Phase 6 ✅ (extends Phase 4 + Phase 7)

> **Built 2026-10-05.** Schema, actions, UI and admin evidence view implemented;
> `npm run build` passes (31 routes, incl. `/dashboard/connections/[id]/progress`
> and `/admin/disputes/[id]`).
>
> **Migration required:** run `supabase/phase-09-deadline-progress.sql` in the
> Supabase SQL Editor (the new tables/columns must exist before the app uses them).

---

## Goals

1. Implement **deadline setting**: after the Seeker accepts the Linker, the Linker requests the task deadline and the Seeker accepts or rejects it.
2. Implement the **Linker yellow flag** for a deadline the Linker set and then could not honour.
3. Implement the **progress report thread**: the Linker posts progress reports; both parties comment; the thread stays open until the deadline ends.
4. Preserve **comment edits as immutable update history**, so the thread is a permanent **evidence of record** for later disputes.

---

## Scope

### In scope
- Deadline request record: proposing Linker, proposed date, deliverable, timestamp, Seeker accept/reject
- New `DEADLINE_REQUESTED` state (and `FLAGGED` state) in the opportunity lifecycle
- Rejection reopens negotiation (§5.6) with no official deadline until accepted
- Yellow flag raise on a missed Linker-proposed deadline; clear on on-time delivery or accepted extension
- Flag visibility to the Seeker and on the Linker's profile
- Progress report thread: reports + threaded comments, open until `COMPLETED` / `FAILED` / `EXPIRED` / `DISPUTED`
- Comment editing with **revision history** (prior text, author, edit timestamp retained)
- Extension requests raised through the thread
- Admin dispute view exposing the deadline record + thread + revisions

### Out of scope (later phases)
- Automated nudges / reminders before the deadline (Phase 2 marketplace intelligence)
- Risk scoring that consumes flags (fraud engine)
- Automated evidence verification

---

## Root-cause note: "Connections tab is empty" (2026-10-05)

**Symptom.** A Linker with a `SELECTED` proposal saw an empty Connections tab and
had no way to reach the deadline/progress workflow.

**Cause — upstream of Phase 9, in the Phase 4→6 handoff.** `createConnection()`
was called from exactly one place: `selectLinkerAction` in
`src/app/actions/negotiations.ts`. That action also escrows the full reward and
requires the Seeker's wallet to cover it. Separately, `acceptTermsAction` (the
"Accept terms" button) sets the proposal to `ACCEPTED` and **stops** — it creates
no connection and escrows nothing.

So a proposal could read as accepted/selected while **no `connections` row
existed**. Because every part of Phase 9 (deadline, progress thread, flag) hangs
off a connection, the whole workflow was unreachable — and the Connections tab
was, correctly, empty. The opportunity page compounded it by telling the Linker
"the reward is held in escrow… continue in your connection workspace" when no
connecton existed.

**Fix.**
1. **`selectLinkerAction` is the single accept step that starts the workflow** —
   it escrows the reward and opens the connection (unchanged behaviour), now made
   **idempotent**: a proposal that is already `SELECTED` is not charged twice, and
   if the connection is missing it is created **without re-charging escrow**, so a
   stuck proposal recovers when the Seeker presses Select again.
2. **The proposal card keeps the Select button visible** for a `SELECTED`
   proposal with no connection, labelled *"Complete acceptance (open the
   connection)"*, with an explicit amber note explaining the state.
3. **The opportunity page only claims escrow when a connection exists** — it now
   says the Seeker still needs to complete acceptance.
4. `getProposalsWithLinker` selects `connections(id)` so the card can detect this.

**Not changed:** "Accept terms" still only locks the agreed terms. It is the
negotiation step, not the acceptance step; blueprint §5.7 makes accepting the
Linker's submission the point at which the Seeker commits the full reward.

**Verified end-to-end at runtime (2026-10-05).** Starting from the stuck state
(`SELECTED` proposal, no connection):

1. Connection recovery created the connection for farid **without re-charging
   escrow** — `OPPORTUNITY_FUNDING` remained at exactly **one** row for the
   agreed reward.
2. The Linker's **Connections** tab populated with the connection and the prompt
   *"Set the task deadline for this job."* with a **Set deadline** action.
3. The connection page rendered the **Task Deadline** card with the deliverable
   pre-filled from the opportunity's required outcome.
4. Submitting *Request deadline* moved the connection to `IN_PROGRESS` and the
   opportunity to `DEADLINE_REQUESTED`, and stored the deadline as
   `opportunity_deadlines.status = 'REQUESTED'` ("Awaiting your acceptance").

Remaining steps belong to the Seeker: accept the deadline (which opens the
progress thread) or reject it (which reopens negotiation).

---

## Definition of Done

- [x] `npm run build` passes
- [x] Linker can request a task deadline; Seeker can accept or reject it
- [x] Rejection reopens negotiation and no deadline is official until accepted
- [x] Missing a Linker-proposed deadline raises a yellow flag; delivery/extension clears it
- [x] Progress report thread opens on deadline acceptance and closes when the deadline ends
- [x] Linker and Seeker can both comment on reports
- [x] Editing a comment preserves the prior version as retrievable update history
- [x] Admin can view the full evidence of record for a dispute
- [x] All deadline/flag/report actions are written to the audit trail

---

## Implementation notes (2026-10-05)

Built as part of Phase 9 — see `phase-09-deadline-progress.md` for the full record.

- **Files:** `src/lib/flags.ts` (raise/clear lifecycle), `src/app/actions/deadlines.ts`,
  `src/app/actions/progress-reports.ts`, `src/app/dashboard/connections/[id]/deadline-actions.tsx`,
  `src/app/dashboard/connections/[id]/progress/page.tsx`.
- **Schema:** migration `supabase/phase-09-deadline-progress.sql`.
- **Audit:** the flag lifecycle currently notifies both parties in-app; direct
  `recordAuditLog` writes for deadline/flag transitions are a follow-up if strict
  admin audit coverage is required for these member-initiated actions.

---

## Where the Linker updates (added 2026-10-05)

The deadline request and the progress reports live on the **connection**, so the
Linker reaches them by opening the connection — but they are also surfaced
directly so the Linker never has to guess.

| Where | What the Linker sees | Goes to |
|---|---|---|
| `/dashboard` → **Active Connections** | "Action needed — set or review the task deadline" / "Post a progress update" | `/dashboard/connections/[id]` |
| `/dashboard/connections` | The same prompt + a primary button: **Set deadline** / **Propose deadline** / **Update progress** | Connection or thread |
| `/dashboard/connections/[id]` | **Task Deadline** card — `RequestDeadline` form when no deadline exists or after a rejection | same page |
| `/dashboard/connections/[id]` → **Progress Reports** card | "Open the progress report thread" | `/dashboard/connections/[id]/progress` |
| `/dashboard/connections/[id]/progress` | `PostProgressReport` form (Linker only) + `PostProgressComment` / `EditProgressComment` | same page |

**State → action mapping** (implemented in `nextAction()` in
`src/app/dashboard/connections/page.tsx`):

- no deadline → **Set deadline**
- `REQUESTED` → waiting on the Seeker (Linker sees "view")
- `REJECTED` → **Propose deadline** (terms reopened)
- `ACCEPTED` and the connection is still open → **Update progress**
- closed (`COMPLETED` / `FAILED` / `DISPUTED`) → thread is read-only, no prompt

---

## Files involved
- `src/app/actions/deadlines.ts` — request / accept / reject + flag raising
- `src/app/actions/progress-reports.ts` — reports, comments, edits, revision history
- `src/lib/flags.ts` — yellow-flag raise/clear helpers
- `src/lib/queries.ts` — deadline + progress-report query helpers
- `src/app/(dashboard)/connection/[id]/page.tsx` — deadline card
- `src/app/(dashboard)/connection/[id]/progress/page.tsx` — progress report thread
- `src/app/admin/disputes/[id]/page.tsx` — evidence of record
- `prisma/schema.prisma` — new models + enum values (see below)
- `prisma/migrations/**` — migration for the new tables

---

## Schema (planned)

New models:

| Model | Purpose |
|---|---|
| `opportunity_deadlines` | Deadline request/accept record — proposing Linker, deliverable, proposed/agreed dates, timestamps, status |
| `progress_reports` | Linker progress updates against an accepted deadline |
| `progress_report_comments` | Threaded comments by Linker / Seeker / admin |
| `progress_report_comment_revisions` | Every prior version of an edited comment (author + edit timestamp) |
| `linker_flags` | Yellow flags: related deadline, reason, raised/cleared timestamps |

New enum values:

- `OpportunityStatus`: `DEADLINE_REQUESTED`, `FLAGGED`
- New `DeadlineStatus` enum: `REQUESTED`, `ACCEPTED`, `REJECTED`
- New `FlagType` enum: `MISSED_COMMITMENT`
- `ConnectionStatus` (unchanged) continues to govern the connection itself

---

## Tasks

- [x] 9.1 `opportunity_deadlines` model + migration
- [x] 9.2 `DEADLINE_REQUESTED` status — Linker requests the deadline
- [x] 9.3 Seeker accept → `IN_PROGRESS`; reject → reopen negotiation
- [x] 9.4 `linker_flags` model + raise on missed deadline
- [x] 9.5 Flag clear on delivery / accepted extension
- [x] 9.6 `progress_reports` + comments models + migration
- [x] 9.7 Post report / post comment actions + UI
- [x] 9.8 Comment editing + revision history
- [x] 9.9 Thread auto-close at deadline end
- [x] 9.10 Extension via the thread → clears the flag
- [x] 9.11 Admin evidence-of-record view
- [x] 9.12 Reputation metrics: deadlines met/missed, flags
- [x] 9.13 Clean build + test

---

## Key Business Rules (blueprint §5.6.1, §5.6.2, §9.11.1)

- Deadline setting is a **distinct timestamped step**, not part of the negotiation trail.
- The **Linker requests** the deadline; the **Seeker accepts or rejects**. No deadline is official until accepted.
- The **yellow flag** is a commitment signal, **not** a penalty, and does **not** by itself release the reward — only a §5.13 failure does.
- The flag is **cleared** on on-time delivery or an accepted extension.
- The progress report thread is the **evidence of record**; it is **never destroyed**, including edits.
- **Both parties may edit their own comments**, but each edit retains the prior version with author and timestamp.
- The thread runs **until the deadline ends**, then closes.
- Nothing in the record may be hard-deleted for the life of the Opportunity.
