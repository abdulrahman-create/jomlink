# Phase 6 — Connection Workflow + Trust

**Status:** ✅ Done · **Depends on:** Phase 5 ✅

---

## Goals

1. Orchestrate the **connection workflow**: appointment → acknowledgement → evidence → completion.
2. Implement the **completion review** + payment release trigger.
3. Build the **trust layer**: ratings, reviews, reputation metrics, verified badge.
4. Handle **failed opportunities** and **extensions**.

---

## Scope

### In scope
- Appointment proposal (date/time/location/method) + Seeker acknowledgement
- Status progression: `IN_PROGRESS → APPOINTMENT_SCHEDULED → AWAITING_VERIFICATION → COMPLETED`
- Evidence submission (meeting photo, screenshot, confirmation, etc.)
- Completion review (simple) → triggers payment release
- Extension request/approval
- Failed opportunity handling
- Ratings + reviews (mutual)
- Reputation metrics (success rate, avg rating, response rate)
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

---

## Files involved
- `src/app/(dashboard)/connection/[id]/page.tsx`
- `src/app/actions/appointments.ts`
- `src/app/actions/evidence.ts`
- `src/app/actions/completions.ts`
- `src/app/actions/reviews.ts`
- `src/app/actions/extensions.ts`
- `src/lib/reputation.ts`

---

## Tasks

- [ ] 6.1 Appointment proposal + acknowledgement
- [ ] 6.2 Evidence submission
- [ ] 6.3 Completion review → release payout
- [ ] 6.4 Extension request/approval
- [ ] 6.5 Failed opportunity flow
- [ ] 6.6 Reviews + ratings
- [ ] 6.7 Reputation metrics
- [ ] 6.8 Clean build + test

---

## Key Business Rules (blueprint §5)

- Seeker must **acknowledge** the proposed connection before sensitive data flows.
- Deliverable must be **defined** (intro, meeting, executive meeting, site visit, etc.).
- Evidence requirement depends on opportunity category.
- Failed = linker did not complete within deadline (no valid extension).