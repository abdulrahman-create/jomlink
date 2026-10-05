# Phase 9 — Deadline Setting + Progress Report Thread + Yellow Flag

**Status:** 🔲 Not started · **Depends on:** Phase 6 ✅ (extends Phase 4 + Phase 7)

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

- [ ] `npm run build` passes
- [ ] Linker can request a task deadline; Seeker can accept or reject it
- [ ] Rejection reopens negotiation and no deadline is official until accepted
- [ ] Missing a Linker-proposed deadline raises a yellow flag; delivery/extension clears it
- [ ] Progress report thread opens on deadline acceptance and closes when the deadline ends
- [ ] Linker and Seeker can both comment on reports
- [ ] Editing a comment preserves the prior version as retrievable update history
- [ ] Admin can view the full evidence of record for a dispute
- [ ] All deadline/flag/report actions are written to the audit trail

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

- [ ] 9.1 `opportunity_deadlines` model + migration
- [ ] 9.2 `DEADLINE_REQUESTED` status — Linker requests the deadline
- [ ] 9.3 Seeker accept → `IN_PROGRESS`; reject → reopen negotiation
- [ ] 9.4 `linker_flags` model + raise on missed deadline
- [ ] 9.5 Flag clear on delivery / accepted extension
- [ ] 9.6 `progress_reports` + comments models + migration
- [ ] 9.7 Post report / post comment actions + UI
- [ ] 9.8 Comment editing + revision history
- [ ] 9.9 Thread auto-close at deadline end
- [ ] 9.10 Extension via the thread → clears the flag
- [ ] 9.11 Admin evidence-of-record view
- [ ] 9.12 Reputation metrics: deadlines met/missed, flags
- [ ] 9.13 Clean build + test

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
