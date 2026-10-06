# Phase 11 — Match Score, Relationship Save & Schema Routing

**Status:** ✅ Done · **Depends on:** Phase 3 (matching), Phase 2 (relationships) · **Updated:** 2026-10-06

> **Built 2026-10-06.** Two data-layer bugs found in live testing — both of which
> made the product unusable in ways that produced *no* error message on screen —
> plus a rewrite of the rule-based match score so it measures what it claims to.
> `npm run build` passes.
>
> **No migration required.** All fixes are in application code; the database
> schema was already correct. Two tables referenced by `prisma/schema.prisma`
> do **not** exist in the live database (§ *Schema drift* below) but are unused
> by application code.

---

## Goals

1. **Make the relationship form save.** The Linker could not persist a
   relationship declaration at all.
2. **Make the whole data layer reach the `jomlink` schema.** The bug behind (1)
   was not specific to relationships — every query was affected.
3. **Make the match score honest.** It computed a number, displayed a confident
   label, and was wrong for most members.
4. **Show the Seeker the signal.** The Seeker — the party choosing a Linker —
   could not see the match score anywhere.

---

## Bugs found in live testing

### 1. Relationship form would not save (`PGRST205`, then `42703`)

**Symptom.** Reported as *"linker > relationship. i cant save this form."* The
submit button produced the generic action error *"Could not save the
relationship."* — which is exactly what the action returns for **any** thrown
error, so the screen said nothing useful.

**Two independent causes, both confirmed by probing the live Supabase instance:**

```
GET /rest/v1/relationships          → 404 PGRST205
  "Could not find the table 'public.relationships' in the schema cache"

GET /rest/v1/relationships?select=id,app → 400 42703
  "column relationships.app does not exist"
```

**Cause A — the schema was applied too late to matter.**
`src/lib/supabase/admin.ts` built the client with **no** `db.schema` option, and
the schema was instead requested per-call:

```ts
getServiceRoleClient().schema("jomlink")   // ← silently ignored
```

`supabase-js` derives its `Accept-Profile` / `Content-Profile` headers inside
`createClient`. Calling `.schema()` on an already-built client returns a **new**
client whose REST headers are dropped, so the request went out with no schema
header at all and PostgREST answered from its default — `public`, where none of
the Jomlink tables live. Verified against supabase-js 2.116:

| Client construction | Header actually sent |
|---------------------|----------------------|
| `createClient(url, key)` | *(none)* → resolves to `public` ❌ |
| `createClient(url, key, { db: { schema: "jomlink" } })` | `accept-profile: jomlink` ✅ |
| `createClient(url, key).schema("jomlink")` | headers dropped ❌ |

**This was not relationship-specific** — it broke every query in `queries.ts`,
`audit.ts` and `data.ts`. The relationship form is simply where it was noticed,
because it is one of the few screens whose *primary* purpose is a write.

**Cause B — a phantom `app` column.** `createRelationship()` inserted
`app: JOMLINK_APP_TAG`. Only the `users` table carries that column; every other
insert in the layer had already been corrected. This one was missed, so even
with the schema fixed the insert would have failed on the column.

**Fixes.**
- `getServiceRoleClient()` now sets `db: { schema: "jomlink" }` at construction,
  with a comment explaining why it must not be moved back out.
- Removed the six now-redundant `.schema("jomlink")` calls (`queries.ts`,
  `audit.ts`, `data.ts`, and two in `actions/kyc.ts`).
- Removed the `app` column from the relationship insert.

**Verified against the live database:**

- All 30 Jomlink tables probed → **28 reachable**.
- The exact insert payload now returns `23503` (foreign-key violation on a
  deliberately fake `user_id`) — proving column names and enum values are
  correct and that the request reached the table.
- A real end-to-end insert against an existing member: **SUCCESS** (probe rows
  deleted afterwards).

### 2. The match score measured almost nothing

The scorer existed, ran on every opportunity view, and displayed a band label
("Good match") with unearned confidence. Four defects:

| # | Defect | Effect |
|---|--------|--------|
| a | Category matched the **enum** (`"BUSINESS_INTRODUCTION"`) against free-text `industry` (`"Finance"`) — these can never substring-match. The `labels` regex table covered only 4 of 11 categories, so it never fired either. | Every member silently received the **8/20** fallback. The heaviest reachable signal was dead. |
| b | `is_restricted_category` was accepted in `MatchInput` and passed by the caller, but **never read**. | Restricted opportunities carried no penalty. |
| c | Entity matching was naive substring on `entity_name` only. `"Maybank"` ⊆ `"Maybank Investment Bank"` worked; `"Malayan Banking Bhd"`, `"CIMB Banks"` and any org held only via `organisation_id` did not. | Real, legitimate relationships scored **zero**. |
| d | `current_organisation` and relationship overlap could both pay out for the *same* employer (25 + 15 = 40). | A single employer could dominate the score twice. |

**Rewrite** (`src/lib/matching.ts`):

- **`CATEGORY_KEYWORDS`** covers all 11 opportunity categories and matches
  industry **prose**, not the enum. `OTHER` is explicitly neutral (12) rather
  than a silent fallback.
- **`entityNamesMatch()`** — normalises punctuation/case, folds plurals, strips
  legal and generic suffixes (`Bhd`, `Sdn`, `Ltd`, `Group`, `Holdings`), then
  requires **every** significant token of the shorter name to appear in the
  longer. Accepts real variants; still rejects `"Malaysia Airlines"` vs
  `"Malaysia Pacific"`.
- **Employment precedence** — `employment_history` at the target entity (25)
  beats `current_organisation` (15), and they are mutually exclusive.
- **`target_role_exact`** is now respected: a partial role overlap no longer
  satisfies an exact-role requirement.
- **Geography fallback** — a matching city earns half weight when the country
  does not match.
- **Restricted penalty** — −10, floored at 0.
- **`MATCH_WEIGHTS`** is exported so the docstring, the UI and any future tests
  read from one source. The old docstring claimed "Reputation → up to 10" when
  the code paid at most 8.

### 3. The Seeker could not see the score

`match_score` was computed only for a logged-in **non-owner** viewing the
opportunity — i.e. the Linker. The Seeker, who is the party actually choosing
between Linkers, saw nothing, even though proposals already carried
`relationship_id` and `relationship_declared`.

**Fix.** `getProposalsWithLinker()` now embeds `member_profiles`,
`employment_history` and `relationships`; the proposals page scores each
proposal server-side and the proposal card shows a match badge with a
plain-language reason ("1st-degree relationship to the target entity"). The
score is passed as a prop because it runs on relationship data the client never
holds.

---

## Scope

### In scope
- Fix the data-layer schema routing (unblocks every query, not just relationships)
- Fix the relationship insert payload
- Rewrite the match score across all seven signals
- Shared `buildMatchInput()` / `matchOpportunityFields()` so the Linker view and
  the Seeker view score **identically** from one code path
- Match badge + reason on the Seeker's proposal review screen
- Correct the stale docstring and the `matchScore` column comment

### Out of scope (later)
- **Persisting** `match_score` — it stays computed-per-request; see *Open* below
- Sorting or filtering proposals/marketplace by score
- ML or learned matching
- Relationship *verification* feeding the score (score trusts self-declaration)

---

## How the score works

Weight ceilings, exported as `MATCH_WEIGHTS`:

| Signal | Max | Rule |
|--------|-----|------|
| Employment at target entity | 25 | `employment_history.organisation` matches the target (mutually exclusive with the row below) |
| Same org via `current_organisation` | 15 | fallback when no employment record matches |
| Declared relationship to target | 15 / 10 / 5 | by connection degree (1st / 2nd / 3rd+) |
| Relationship degree bonus | 5 / 3 | extra for 1st / 2nd degree |
| Relationship names the target role | 5 | `relevance_note` overlaps `target_role` |
| Warm relationship category | 3 | employee / partner / client / investor / advisor |
| Category relevance | 20 | industry prose vs `CATEGORY_KEYWORDS` (neutral 12 for `OTHER`, fallback 8) |
| Target-role keyword overlap | 15 | significant tokens, capped; exact-role requires full overlap |
| Geographic preference | 10 / 5 | country full, city half |
| Reputation | 8 | verified badge 5; ≥10y experience 3, ≥5y 2 |
| **Restricted category** | **−10** | harder to service |

Result is clamped to `0–100` and rounded. Bands: **≥80** Strong · **≥50** Good ·
**≥25** Possible · **<25** Low.

The score remains a **signal, not a guarantee of access** (blueprint §3–4) — it
surfaces likely candidates and does not gate anything.

---

## Files involved

**Modified**
- `src/lib/supabase/admin.ts` — `db: { schema: "jomlink" }` at construction
- `src/lib/queries.ts` — drop `.schema()`; drop `app` from relationship insert;
  embed Linker profile/employment/relationships in `getProposalsWithLinker`
- `src/lib/data.ts`, `src/lib/audit.ts` — drop `.schema()`
- `src/app/actions/kyc.ts` — drop `.schema()`; use `jomlinkSchema()` for the two
  `kyc_biometrics` writes (the typed client resolves unknown tables to `never`)
- `src/lib/matching.ts` — rewrite; new exports `entityNamesMatch`,
  `MATCH_WEIGHTS`, `matchVariant`, `matchReason`, `buildMatchInput`,
  `matchOpportunityFields`, types `LinkedMember`, `EmbeddedProfile`
- `src/app/opportunities/[id]/page.tsx` — use shared helpers; load employment;
  show the contributing reason instead of generic copy
- `src/app/opportunities/[id]/proposals/page.tsx` — score each proposal
- `src/app/opportunities/[id]/proposals/proposal-card.tsx` — match badge
- `prisma/schema.prisma` — document `matchScore` as reserved-and-unused

---

## Definition of Done

- [x] `npm run build` passes
- [x] `npx tsc --noEmit` passes
- [x] A Linker can save a relationship declaration
- [x] All Jomlink tables are reachable through the data layer
- [x] Category relevance actually distinguishes industries
- [x] Restricted categories are penalised
- [x] Common entity-name variants ("Bhd", "Sdn", plurals) match
- [x] One employer cannot be counted twice
- [x] Exact-role requirements are enforced
- [x] Seeker and Linker score from the same code path
- [x] The Seeker sees a match badge and a reason on each proposal

---

## Verification performed

- **Live database probes** for both bugs, captured before and after the fix.
- **30-table reachability sweep** → 28 reachable (see *Schema drift*).
- **Real end-to-end relationship insert** against an existing member → success,
  probe rows removed.
- **supabase-js header proof** — constructed clients with and without
  `db.schema` and captured the actual outgoing `accept-profile` header.
- **36 assertions across 12 scorer scenarios** (entity-name edge cases, every
  category, all three degrees, employment precedence, exact-role gating,
  restricted penalty, cap/floor, null-safety) via a temporary harness built on
  the esbuild bundled with Next. The harness was **deleted after the run** — no
  scratch files remain, and the repo still has no test runner.

---

## Schema drift (pre-existing, not introduced here)

The app's runtime data path is **Supabase** via `supabase-js`. `prisma/schema.prisma`
is legacy reference only (stating this explicitly, since the two disagree).

Two Prisma models have **no table** in the live database:

| Model | In live DB | Used by app code |
|-------|-----------|------------------|
| `relationship_verifications` | ❌ No | No |
| `membership` | ❌ No | No |

Neither is referenced anywhere in `src/`, and neither appears in
`supabase/jomlink-schema.sql` either — so nothing is broken today. Flagged
because the Prisma schema implies these tables exist.

---

## Open / follow-up

1. **`match_score` is never persisted.** The column exists (and is documented as
   reserved), and the score is recomputed on every page view. Persisting it would
   require a write path on opportunity create plus a backfill, and would need
   invalidating whenever a Linker edits their profile or relationships — which is
   exactly why it is currently computed live.
2. **The Seeker's match badge is informational only.** Proposals are not sorted
   or filtered by score. Whether fit should influence ordering is a product
   decision, not a bug fix.
3. **Scoring behaviour changed for existing data.** A finance-industry Linker on
   an investor-connection opportunity previously scored 8 and now scores 28. The
   increase *is* the bug fix (defect 2a), but members returning to the app will
   see different numbers than they remember.
4. **The score trusts self-declared relationships.** A member can claim any
   relationship and collect up to 26 points. `relationship_verifications` exists
   in Prisma precisely to address this and is not built (see *Schema drift*).
5. **`is_restricted_category` semantics are unconfirmed.** It now applies a flat
   −10. Whether a restricted opportunity should instead be *blocked* for
   unverified Linkers, or carry a different weight, is a business question.
6. **Two stale lint findings remain**, both pre-existing and verified as such by
   stashing the changes and re-running: an unused `opportunityId` prop in
   `proposal-card.tsx` and one `any` in `queries.ts`.

---

## Recurring bug pattern (continued from Phase 10)

Phase 10 recorded the shape *"the UI offers a state the backend never reaches, or
an action at the wrong point in the lifecycle."* This phase adds a second shape
worth watching:

> **A confident number computed from data that never actually arrives.**

The match score displayed "Good match" for members whose category signal had
never once fired. Nothing errored, nothing logged — the function was simply
reading a field that could never contain the value it compared against.

**Rule of thumb when a value is *displayed*:** assert that the branch producing
it can actually be taken. Grep the input field's real source and confirm the
comparison is between like values — an enum compared to free text, or a column
that no code writes, both produce plausible-looking output forever.

Similarly, both bugs here were **invisible on screen**: one leaked through a
generic catch-all error string, the other through a number that was wrong but
never obviously so. Where an action can fail for structurally different reasons,
surface which one.
