# Phase 3 — Opportunity Marketplace + Matching

**Status:** ✅ Done · **Depends on:** Phase 2 ✅

---

## Goals

1. Let Seekers **create structured Opportunities** (category → target → role → outcome → reward → deadline).
2. Let Linkers **browse, search and filter** live opportunities.
3. Implement a **rule-based match score** indicating relevance.
4. Handle the **posting model**: a **refundable 10% posting deposit** auto-deducted from the Seeker's wallet at post time (payment stubbed for now, calculated), less a flat **RM10 non-refundable listing fee** if cancelled before a Linker is selected. The reward itself is **not** charged at posting.
5. Restrict the **Government / Public Sector** category.

---

## Scope

### In scope
- Opportunity creation wizard (`/opportunities/new`) with all blueprint fields
- Publish → status goes `DRAFT → PENDING_PAYMENT → ACTIVE`
- **10% posting deposit** (refundable service charge, less the RM10 listing fee on pre-selection cancellation) auto-deducted from the Seeker's wallet at post time; posting blocked when wallet credit is insufficient (recorded in `transactions` as simulated)
- Marketplace browse (`/marketplace`) with search + filters (category, country, reward, deadline, verified-only)
- Opportunity detail page (`/opportunities/[id]`)
- Rule-based **match score** (entity relationship, role, industry, geography, reputation)
- Restricted category flag for Government / Public Sector
- New-opportunity notifications (in-app)

### Out of scope (later phases)
- Real payment gateway (Phase 5)
- Advanced/ML matching (future)
- Direct/private invitations (Phase 4+)

---

## Definition of Done

- [x] `npm run build` passes
- [x] Seeker can create + publish an opportunity
- [x] Published opp appears in marketplace + is searchable/filterable
- [x] Match score is computed and displayed
- [x] Government category is flagged restricted
- [x] Posting deposit math (10% of reward) is correct in the transaction record
- [x] Posting is blocked when the Seeker's wallet has insufficient credit for the 10% deposit

---

## Files involved
- `src/app/opportunities/new/page.tsx` + `opportunity-form.tsx` (wizard)
- `src/app/marketplace/page.tsx`
- `src/app/opportunities/[id]/page.tsx` + `actions.tsx`
- `src/app/actions/opportunities.ts`
- `src/lib/matching.ts` — match score logic
- `src/lib/funding.ts` — fee/escrow math
- Query helpers added to `src/lib/queries.ts` (opportunities + transactions)

---

## Tasks

- [x] 3.1 Opportunity creation wizard
- [x] 3.2 Funding/escrow calculation module
- [x] 3.3 Publish + status flow (DRAFT → PENDING_PAYMENT → ACTIVE)
- [x] 3.4 Marketplace listing + search + filters
- [x] 3.5 Opportunity detail page
- [x] 3.6 Match-score module
- [x] 3.7 Restricted category handling
- [x] 3.8 Clean build + test

---

## Key Business Rules (blueprint §3–4)

- Reward is tied to the **defined deliverable**, not vague outcomes.
- Target role can be **Exact** or **Flexible/Equivalent**.
- Match score = relevance indicator, **not** a guarantee of access.
- Public listing only shows non-sensitive info (Confidentiality level respected).
- **Posting deposit:** posting an Opportunity requires a **10% deposit** (of the reward), auto-deducted from the Seeker's wallet. If the Seeker cancels **before any Linker is selected**, the deposit is refunded **less the RM10 non-refundable listing fee**; once a Linker is selected the deposit is consumed.
- **Unlimited posting:** a Seeker may post as many Opportunities as they wish, provided each posting is covered by sufficient wallet credit.
- **Insufficient credit blocks posting:** the Seeker cannot post if their wallet cannot cover the 10% deposit.
- **Reward is not charged at posting:** the full reward is only settled later, when the Seeker **accepts a Linker's submission** (see Phase 5).