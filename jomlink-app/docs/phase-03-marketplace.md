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
- **Owner editing** of an Opportunity (`/opportunities/[id]/edit`) — the Seeker can amend a listing **only while no Linker has submitted a proposal**
- Rule-based **match score** (entity relationship, role, industry, geography, reputation) — see *Match scoring* below for the current implementation, rewritten in Phase 11
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
- [x] Seeker can edit their own opportunity, and editing is locked once a Linker submits a proposal

---

## Files involved
- `src/app/opportunities/new/page.tsx` + `opportunity-form.tsx` (wizard)
- `src/app/marketplace/page.tsx`
- `src/app/opportunities/[id]/page.tsx` + `actions.tsx`
- `src/app/opportunities/[id]/edit/page.tsx` + `opportunity-edit-form.tsx` (owner edit)
- `src/app/actions/opportunities.ts` — `createOpportunityAction`, `publishOpportunityAction`, `updateOpportunityAction`
- `src/lib/matching.ts` — match score logic
- `src/lib/funding.ts` — fee/escrow math
- Query helpers added to `src/lib/queries.ts` (opportunities + transactions + `hasProposalsForOpportunity`)

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
- [x] 3.9 Owner editing + proposal edit-lock

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

### Opportunity editing (Seeker)

- **Owner-only:** only the Seeker who created the Opportunity (`seeker_id`) can edit it; other members see 404 on the edit route.
- **Editable window:** the Seeker may edit while the status is one of `DRAFT`, `PENDING_PAYMENT`, `ACTIVE`, `PROPOSAL_RECEIVED`, `NEGOTIATION` **and** no Linker has submitted a proposal.
- **Proposal locks editing — the key rule:** as soon as **any Linker submits a proposal**, the Opportunity becomes **read-only for the Seeker**. A Linker has based their proposal on the current terms, so the listing is frozen from that point (not merely at Linker *selection*).
- **Selection / escrow locks editing:** once a Linker is selected or the reward is funded/escrowed (e.g. `LINKER_SELECTED`, `IN_PROGRESS`, `COMPLETED`, `DISPUTED`, `FAILED`, `EXPIRED`, `CANCELLED`), editing is also refused — the transaction is contractually committed.
- **Enforcement:** the rule is enforced in **three places** so it cannot be bypassed:
  1. `updateOpportunityAction` (server action) re-checks status **and** `hasProposalsForOpportunity(opp.id)` before writing;
  2. the edit page (`/opportunities/[id]/edit`) renders a lock notice instead of the form when the rule blocks editing;
  3. the detail page hides the **Edit opportunity** button when `canEdit` is false.
- **No silent overwrite:** the underlying write still goes through `updateOpportunityIfOwned(id, seekerId, …)`, so even a direct call cannot modify someone else's listing.

---

## Match scoring

> **Rewritten in Phase 11.** The scorer described here was replaced — see
> `phase-11-match-score-and-data-layer.md` for the full rationale. The summary
> below reflects the current implementation in `src/lib/matching.ts`.

`computeMatchScore()` returns an integer **0–100** from seven weighted signals.
It is computed **per request** (it depends on which Linker is viewing) and is
**never persisted** — `opportunities.match_score` is reserved and always `NULL`.

| Signal | Max | Rule |
|--------|-----|------|
| Employment at target entity | 25 | `employment_history.organisation` matches the target |
| Same org via `current_organisation` | 15 | fallback only — mutually exclusive with the row above |
| Declared relationship to target | 15 / 10 / 5 | by connection degree (1st / 2nd / 3rd+) |
| Relationship degree bonus | 5 / 3 | extra for 1st / 2nd degree |
| Relationship names the target role | 5 | `relevance_note` overlaps `target_role` |
| Warm relationship category | 3 | employee / partner / client / investor / advisor |
| Category relevance | 20 | industry prose vs `CATEGORY_KEYWORDS` (neutral 12 for `OTHER`, fallback 8) |
| Target-role keyword overlap | 15 | significant tokens; exact-role requires full overlap |
| Geographic preference | 10 / 5 | country full, city half |
| Reputation | 8 | verified badge 5; ≥10y experience 3, ≥5y 2 |
| **Restricted category** | **−10** | harder to service |

Bands: **≥80** Strong · **≥50** Good · **≥25** Possible · **<25** Low.

**Both sides score from one code path.** `buildMatchInput()` and
`matchOpportunityFields()` flatten either embedded row shape, so the Linker's
view of an opportunity and the Seeker's view of a proposal produce identical
numbers.

**Where it is shown:**
- **Linker** — a badge card on `/opportunities/[id]`, with the strongest
  contributing reason (`matchReason()`).
- **Seeker** — a match badge on each proposal card in
  `/opportunities/[id]/proposals`, added in Phase 11. Purely informational;
  proposals are **not** sorted or filtered by score.

**The score remains a signal, not a guarantee of access** (blueprint §3–4). It
trusts **self-declared** relationships — a member can claim any relationship and
collect up to 26 points. Verification (`relationship_verifications`) is defined
in Prisma, has no live table, and is not built.

**Entity matching** uses `entityNamesMatch()`: punctuation/case normalisation,
plural folding, legal/generic suffix stripping (`Bhd`, `Sdn`, `Ltd`, `Group`,
`Holdings`), then every significant token of the shorter name must appear in the
longer. This accepts `"Maybank"` vs `"Maybank Investment Bank"` and rejects
`"Malaysia Airlines"` vs `"Malaysia Pacific"`.