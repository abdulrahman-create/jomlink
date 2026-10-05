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
