# Phase 4 — Linker Proposals + Negotiation

**Status:** ✅ Done · **Depends on:** Phase 3 ✅

---

## Goals

1. Let Linkers **apply** to opportunities by submitting structured proposals (with relationship declaration).
2. Let Seekers **compare proposals** and evaluate Linkers.
3. Implement **negotiation** (reward counter-offers, target substitution, terms).
4. Handle **Linker selection** and terms locking — the point at which **negotiation opens** and the workflow hands off to **deadline setting** (Phase 6).

---

## Scope

### In scope
- Proposal submission (`relationship banks` + proposed target/method/deliverable/reward)
- Relationship declaration + degree + supporting note
- Proposal evaluation UI (compare cards)
- Negotiation thread (offer ↔ counter-offer on reward & terms) — **opens once the Seeker has accepted the Linker**
- Target substitution with explicit Seeker acknowledgement
- Terms **locking** on mutual acceptance
- Linker selection (Seeker picks one proposal → `LINKER_SELECTED`)
- **Full reward settlement** required at acceptance — the Seeker's wallet must cover the full agreed reward, which is then held in escrow
- Proposal statuses throughout lifecycle
- **Hand-off**: once selected and terms are agreed, the Linker proceeds to request the task deadline (Phase 6, `DEADLINE_REQUESTED`)

### Out of scope (later phases)
- Multi-linker funding models (shared vs. multiple funded) — Phase 5+
- Appointment scheduling (Phase 6)
- Payment/escrow movement (Phase 5)
- **Deadline setting + progress report thread** (Phase 6 — negotiation ends here, execution begins there)

---

## Definition of Done

- [x] `npm run build` passes
- [x] Linker can apply with a proposal
- [x] Seeker sees all proposals for an opportunity and can compare
- [x] Both sides can negotiate reward (+ counter-offers stored)
- [x] Target substitution can be acknowledged or rejected by Seeker
- [x] Seeker can select a linker; agreed terms are locked
- [x] Accepting a Linker requires **full settlement of the reward** in the Seeker's wallet (held in escrow)

---

## Files involved
- `src/app/opportunities/[id]/apply/page.tsx` + `proposal-form.tsx`
- `src/app/dashboard/proposals/page.tsx` (Linker "My Proposals")
- `src/app/opportunities/[id]/proposals/page.tsx` + `proposal-card.tsx` (Seeker comparison + negotiation)
- `src/app/api/proposals/[id]/negotiations/route.ts`
- `src/app/actions/proposals.ts`
- `src/app/actions/negotiations.ts`
- Query helpers added to `src/lib/queries.ts` (proposals + negotiations)

---

## Tasks

- [x] 4.1 Proposal submission form
- [x] 4.2 Relationship declaration in proposal
- [x] 4.3 Proposal evaluation / comparison UI
- [x] 4.4 Negotiation thread + counter-offers
- [x] 4.5 Target substitution acknowledgement
- [x] 4.6 Linker selection + terms lock
- [x] 4.7 Clean build + test

---

## Key Business Rules (blueprint §5)

- Linker must clearly state the **basis of their claimed relationship**.
- Exact personal contact info is hidden until a later stage.
- If Seeker rejects a target substitution → the connection does not proceed, Linker not paid for that outcome.
- Agreed commercial terms become **locked** once both confirm.
- **Full reward settlement at acceptance:** the Seeker must have the **full agreed reward** available in their wallet before accepting a Linker's submission. The reward is deducted and held in escrow at that point (the 10% posting deposit was already paid at post time; it is refundable less the RM10 listing fee only until a Linker is selected, after which it is consumed).

### Negotiation window (blueprint §5.6)

- **Negotiation opens when the Seeker accepts the Linker**, not before — accepting the Linker is what brings both parties into a working relationship.
- Negotiation covers reward, target, deliverable, connection method, appointment conditions, and acceptable alternatives.
- The **task deadline is negotiated separately** through the deadline-setting step (§5.6.1, Phase 6) so it always has its own timestamped record. Deadline is listed here as a negotiable topic, but its **acceptance is recorded by the deadline module**, not the proposal thread.
- Once terms are locked and the deadline is accepted, the Opportunity leaves this phase and enters execution (progress report thread, Phase 6).