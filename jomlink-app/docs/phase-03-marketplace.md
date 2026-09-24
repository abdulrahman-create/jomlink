# Phase 3 — Opportunity Marketplace + Matching

**Status:** ✅ Done · **Depends on:** Phase 2 ✅

---

## Goals

1. Let Seekers **create structured Opportunities** (category → target → role → outcome → reward → deadline).
2. Let Linkers **browse, search and filter** live opportunities.
3. Implement a **rule-based match score** indicating relevance.
4. Handle the **funding model**: 10% activation fee + reward escrow (payment stubbed for now, calculated).
5. Restrict the **Government / Public Sector** category.

---

## Scope

### In scope
- Opportunity creation wizard (`/opportunities/new`) with all blueprint fields
- Publish → status goes `DRAFT → PENDING_PAYMENT → ACTIVE`
- Activation fee (10%) + escrow amount calculation (recorded in `transactions` as simulated)
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
- [x] Funding math (10% + reward) is correct in the transaction record

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