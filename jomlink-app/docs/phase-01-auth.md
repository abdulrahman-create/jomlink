# Phase 1 — Database Migration + Auth Flow

**Status:** ✅ Complete · **Depends on:** Phase 0 ✅
**Completed:** 2026-09-18

---

## Goals

1. Apply the initial Prisma migration so all tables exist in PostgreSQL.
2. Create a seed script with reference data (categories, admin roles, relationships).
3. Build the **register / login / logout** flow using **Supabase Auth** for identity and **Prisma** for the Jomlink member record.
4. Protect routes and establish the current user in server components.

---

## Scope

### In scope
- `prisma migrate dev --name init`
- Reference data seeding (opportunity categories, relationship categories, admin roles/super admin)
- Register (email + password → Supabase user + Prisma `users` + `member_profiles`)
- Email verification placeholder (status flag)
- Login / logout (Supabase session via cookies)
- `getCurrentUser()` helper (server-side)
- Route protection middleware
- `/login`, `/register` pages + auth layout

### Out of scope (later phases)
- Mobile number verification
- KYC document upload
- Profile editing (Phase 2)
- Forgot-password flows (nice-to-have)

---

## Definition of Done

- [ ] `npm run build` passes
- [ ] Seed runs: `npx tsx prisma/seed.ts`
- [ ] A user can register, log in, and land on `/dashboard`
- [ ] Logged-out users are redirected away from protected routes
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never used client-side

---

## Key Implementation Notes

### Auth flow (Supabase + Prisma)
1. Client calls Supabase Auth `signUp` / `signInWithPassword`.
2. Server action captures the created `supabaseUserId`.
3. Prisma creates a `users` row + `member_profiles` row.
4. Session cookie managed by `@supabase/ssr` (we already have `middleware.ts` + `server.ts`).

### Files involved
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/actions/auth.ts`
- `src/lib/auth.ts` — `getCurrentUser()`
- `prisma/seed.ts`

---

## Tasks

- [ ] 1.1 Run initial migration
- [ ] 1.2 Write `prisma/seed.ts` (categories, admin roles, demo users)
- [ ] 1.3 Create auth server actions
- [ ] 1.4 Create `getCurrentUser()` helper
- [ ] 1.5 Build `/register` + `/login` pages
- [ ] 1.6 Wire route protection (middleware / layout)
- [ ] 1.7 Clean build + test the flow end-to-end

---

## Notes / Risks
- Supabase self-hosted URL + keys already in `.env.local`.
- If registration should require email confirmation, set Supabase email confirmation ON — but for local dev we may keep it OFF to avoid friction.