# Phase 6 — Connection Workflow + Trust

**Status:** ✅ Done · **Depends on:** Phase 5 ✅

---

## Goals

1. Orchestrate the **connection workflow**: appointment → acknowledgement → evidence → completion.
2. Implement the **completion review** + payment release trigger.
3. Build the **trust layer**: ratings, reviews, reputation metrics, verified badge.
4. Handle **failed opportunities** and **extensions**.
5. Implement **deadline setting** (Linker requests → Seeker accepts/rejects) and the **Linker yellow flag** for missed commitments.
6. Implement the **progress report thread** — Linker reports + two-way comments with **edit history preserved as dispute evidence**.

---

## Scope

### In scope
- Appointment proposal (date/time/location/method) + Seeker acknowledgement
- Status progression: `IN_PROGRESS → APPOINTMENT_SCHEDULED → AWAITING_VERIFICATION → COMPLETED`
- **Deadline request / accept / reject** flow (new `DEADLINE_REQUESTED` state)
- **Yellow flag** raised on a missed Linker-proposed deadline; cleared on delivery or accepted extension
- **Progress report thread** (Linker posts reports; Linker + Seeker comment; reports close when the deadline ends)
- **Comment editing with immutable revision history** (old comment text retained as update history)
- Evidence submission (meeting photo, screenshot, confirmation, etc.)
- Completion review (simple) → triggers payment release
- Extension request/approval
- Failed opportunity handling
- Ratings + reviews (mutual)
- Reputation metrics (success rate, avg rating, response rate, **deadlines met/missed, yellow flags**)
- Verified member badge display

### Out of scope (later phases)
- Dispute management (Phase 7 / admin)
- Automated evidence verification
- Relationship verification admin

---

## Definition of Done

- [x] `npm run build` passes
- [x] Appointment can be proposed + acknowledged/rejected by Seeker
- [x] Evidence can be submitted and marked (simple) complete
- [x] Completion releases the escrow payout (via Phase 5)
- [x] Members can rate/review each other post-completion
- [x] Reputation metrics update correctly
- [x] Linker can request a task deadline; Seeker can accept/reject it
- [x] Missing a Linker-proposed deadline raises a yellow flag; delivery or an accepted extension clears it
- [x] Progress report thread works: Linker posts, both parties comment, thread closes at deadline
- [x] Editing a comment preserves the prior version as retrievable update history

---

## Files involved
- `src/app/(dashboard)/connection/[id]/page.tsx`
- `src/app/(dashboard)/connection/[id]/progress/page.tsx` — progress report thread
- `src/app/actions/appointments.ts`
- `src/app/actions/deadlines.ts` — deadline request / accept / reject + flag raising
- `src/app/actions/progress-reports.ts` — reports, comments, edits
- `src/app/actions/evidence.ts`
- `src/app/actions/completions.ts`
- `src/app/actions/reviews.ts`
- `src/app/actions/extensions.ts`
- `src/lib/reputation.ts`
- `src/lib/flags.ts` — yellow-flag raise/clear helpers

---

## Tasks

- [ ] 6.1 Appointment proposal + acknowledgement
- [ ] 6.2 Evidence submission
- [ ] 6.3 Completion review → release payout
- [ ] 6.4 Extension request/approval
- [ ] 6.5 Failed opportunity flow
- [ ] 6.6 Reviews + ratings
- [ ] 6.7 Reputation metrics
- [ ] 6.8 Deadline request / accept / reject flow
- [ ] 6.9 Yellow flag raise / clear
- [ ] 6.10 Progress report thread (reports + comments)
- [ ] 6.11 Comment editing with revision history
- [ ] 6.12 Clean build + test

---

## Key Business Rules (blueprint §5)

- Seeker must **acknowledge** the proposed connection before sensitive data flows.
- Deliverable must be **defined** (intro, meeting, executive meeting, site visit, etc.).
- Evidence requirement depends on opportunity category.
- Failed = linker did not complete within deadline (no valid extension).

### Deadline setting (§5.6.1)

- After the Seeker accepts the Linker, the **Linker requests the task deadline** as a distinct, timestamped step — not part of the negotiation trail.
- The **Seeker accepts** (deadline becomes official, task → `IN_PROGRESS`) or **rejects/requests a change** (terms reopen for negotiation, §5.6).
- A Linker who has set a deadline but cannot deliver by it receives a **yellow flag**. The flag is a commitment signal, not a penalty, and does **not** by itself release the reward.
- The flag is **cleared** automatically on on-time delivery or an accepted extension.
- Flags feed the Linker Performance Record + Reputation, and repeated flags are a fraud/abuse signal.

### Progress report thread (§5.6.2)

- Opens when the Seeker accepts the deadline; remains open **until the deadline ends** (closes at `COMPLETED` / `FAILED` / `EXPIRED` / `DISPUTED`).
- **Linker posts** the reports (reporting obligation); **both Linker and Seeker comment** on them.
- Either party **may edit their own comment**, but **every edit preserves the previous version as update history**, visible to both parties and to admin.
- Nothing in the thread is ever destroyed — it is the platform's **evidence of record** for later disputes (§9.11.1).
- Extension requests are raised **through the thread** so the reason and both positions are captured.