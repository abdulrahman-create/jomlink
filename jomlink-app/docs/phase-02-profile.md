# Phase 2 — Member Profile + Relationships

**Status:** ✅ Complete · **Depends on:** Phase 1 ✅
**Completed:** 2026-09-18

---

## Goals

1. Enable members to **complete their professional profile** (headline, position, organisation, industry, languages, bio, employment history).
2. Enable members to **declare professional relationships** to organisations/entities (the platform's core differentiator) — with category, visibility, and degree.
3. Support **dual roles** (Seeker + Linker) on one account.
4. Add a **Verified badge** surface (simplified verification).

---

## Scope

### In scope
- Profile edit page (`/dashboard/profile`)
- Employment history CRUD
- Relationship declaration CRUD (`/dashboard/relationships`)
- Relationship visibility control (Public / Platform-only / Opportunity-specific)
- Business profile creation (optional, helps context for opportunities)
- Seeker ↔ Linker role toggling
- Public profile page (`/members/[id]`) — shows relevant info only, never personal contact details
- Simplified verification status display

### Out of scope (later phases)
- Document-upload KYC
- Relationship verification workflow (comes with Phase 6 / admin)
- Reputation computation (Phase 6)

---

## Definition of Done

- [x] `npm run build` passes
- [x] Member can save/update full professional profile
- [x] Member can add/remove employment history entries
- [x] Member can declare relationships with category + visibility
- [x] Public profile page renders correctly and does NOT leak contact info
- [x] Role toggle (Seeker/Linker/Both) works

---

## Files involved
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/(dashboard)/profile/relationships/page.tsx`
- `src/app/actions/profile.ts`
- `src/app/actions/relationships.ts`
- `src/app/members/[id]/page.tsx`
- UI: form components (phase 0 library)

---

## Key Business Rules (from blueprint §2)
- One member, multiple roles — no separate accounts.
- Relationship visibility:
  - **Public:** e.g. "Prasarana Malaysia Berhad — Former Employee"
  - **Platform-only:** used by matching, never shown
  - **Opportunity-specific:** disclosed to a Seeker when relevant
- Exact personal contact information is **never** made public.

---

## Tasks

- [ ] 2.1 Profile edit page + save action
- [ ] 2.2 Employment history CRUD
- [ ] 2.3 Relationship declaration CRUD + visibility
- [ ] 2.4 Business profile creation
- [ ] 2.5 Role toggling (Seeker/Linker/Both)
- [ ] 2.6 Public profile page
- [ ] 2.7 Clean build + test

---

## Notes / Risks
- The **relationship database is the core asset** — treat visibility & privacy rules as first-class.
- Future-proof: relationship should later link to a shared `organisations` entity table (already in schema).