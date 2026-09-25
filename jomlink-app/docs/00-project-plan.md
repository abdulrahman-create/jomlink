# 📋 Jomlink — Project Plan

**Version:** 1.0 · **Status:** Planning
**Updated:** 2026-09-24

A marketplace for business introductions — connecting people who need access to people, organisations and opportunities with people who hold legitimate professional relationships (Linkers).

---

## 1. Purpose of This Document

We build **phase by phase**, validating each phase before moving on. This plan defines:

1. How the project is broken into **buildable, testable phases**.
2. What is **in scope / out of scope** for each phase.
3. The **definition of done** for each phase.
4. The **current status** so we always know where we are.

---

## 2. Confirmed Technical Decisions

| Concern | Decision | Notes |
|--------|----------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | Turbopack, `src/` dir |
| Styling | Tailwind CSS v4 + design tokens | Jomlink brand (carmine/cotton-candy) |
| Data layer | supabase-js 2 (service-role) → `jomlink` schema | Replaced Prisma at runtime; legacy Prisma artifacts kept as reference only |
| Database | Supabase PostgreSQL (isolated `jomlink` schema) | NOT `public` — avoids collision with other apps in same Supabase |
| Schema isolation | `PGRST_DB_SCHEMAS` exposes `jomlink` | `.schema('jomlink').from('table')` pattern |
| Auth | Supabase Auth (self-hosted) | Anon key public; SERVICE_ROLE server-only; users tagged `app='jomlink'` to avoid conflicts |
| Auth isolation | `app='jomlink'` tag check | `getCurrentUser()` only matches/link Jomlink-tagged users |
| Payments | Sandbox/stubbed gateway (planned) | Escrow,  10% activation fee,  3% linker fee,  7-day auto-release |
| Verification | Simplified (status + badge) | Full document KYC deferred |

---

## 3. High-Level Architecture

```
Browser
  → Next.js App (React Server Components + Client components)
      → Server Actions / Route Handlers (business logic)
          → supabase-js service-role client → schema('jomlink') → Supabase Postgres
          → Supabase Auth        ── identity / sessions (tagged app='jomlink')
```

**Key principles:**
- All **business data lives in the isolated `jomlink` schema** inside the user's self-hosted Supabase (NOT `public`), so it can never collide with other apps.
- Supabase Auth users are **tagged `app='jomlink'`** via `app_metadata`; all member queries filter `app='jomlink'`, so the app only ever touches its own users.
- The service-role key is **server-only** and must never be exposed to the browser.

---

## 4. Phase Roadmap (Build Order)

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Foundation / scaffolding | ✅ Done |
| **Plan** | Project planning documentation | ✅ Done |
| **1** | DB migrate + seed + auth flow | ✅ Done |
| **2** | Member profile + relationships | ✅ Done |
| **3** | Opportunity marketplace + matching | ✅ Done |
| **4** | Linker proposals + negotiation | ✅ Done |
| **5** | Transactions / escrow | ✅ Done |
| **6** | Connection + completion + trust | ✅ Done |
| **7** | Admin / RBAC + disputes | 🟡 In progress |
| **8** | Dashboard + wallet + polish | 🔲 Not started |

> Each phase has its own detail page in this `docs/` folder.

---

## 5. Guiding Rules

- **Build one phase at a time.** Do not jump ahead.
- **Every phase is production-build-clean** (`npm run build` passes) before we move on.
- **DB schema is centralized** in `prisma/schema.prisma`. Add migrations phase-by-phase.
- **Never expose `SERVICE_ROLE_KEY`** to the browser.
- **Privacy by design** — relationship data must never leak personal contacts.
- **MVP simplicity + scalable architecture** — avoid decisions that block future multi-country, multi-currency, or business accounts.

---

## 6. Current Project Snapshot

Already built:

**Phase 0 (Foundation):**
- Next.js + Tailwind + TS scaffold ✅
- Supabase env config (`.env.local`, git-ignored) ✅
- Full Prisma schema (validated, client generated) ✅
- Design system + landing page + core UI components ✅
- Prisma 7 config + pg driver adapter ✅
- PostgreSQL running in Docker (ready for migrations) ✅
- Personal logo + icon integrated (header, footer, favicon) ✅

**Phase 1 (Auth):**
- Initial migration applied (26 tables) ✅
- Seed script: super admin, demo member, sample orgs/relationships ✅
- Register / login / logout (Supabase Auth + Prisma) ✅
- `getCurrentUser()` with auto-provisioning for existing Supabase users ✅
- Route protection via Next.js 16 `proxy.ts` ✅
- Build passes ✅

**Phase 2 (Profile + Relationships):**
- Dashboard layout with sidebar navigation ✅
- Profile edit page (headline, position, org, industry, languages, bio) ✅
- Employment history CRUD ✅
- Relationship declarations with category, visibility, degree ✅
- Business profile creation + role toggle (Seeker/Linker/Both) ✅
- Public profile page (`/members/[id]`) — privacy-by-design, no contact leakage ✅
- Build passes ✅

**Phase 3 (Opportunity Marketplace + Matching):**
- Opportunity creation wizard (`/opportunities/new`) with all blueprint fields ✅
- Funding/escrow math module (`src/lib/funding.ts`): 10% activation fee + reward escrow ✅
- Publish flow: DRAFT → PENDING_PAYMENT → ACTIVE (simulated transactions) ✅
- Marketplace browse (`/marketplace`) with search + filters (category, country, reward) ✅
- Opportunity detail page (`/opportunities/[id]`) with funding breakdown ✅
- Rule-based match score (`src/lib/matching.ts`) shown to Linkers ✅
- Restricted Government / Public Sector category flagged + forced RESTRICTED ✅
- Build passes ✅

**Phase 4 (Linker Proposals + Negotiation):**
- Linker proposal submission (`/opportunities/[id]/apply`) with relationship declaration ✅
- Seeker proposal comparison (`/opportunities/[id]/proposals`) ✅
- Negotiation thread + counter-offers (reward/terms) via `/api/proposals/[id]/negotiations` ✅
- Target substitution flag + reason (Seeker acknowledges) ✅
- Linker selection → opportunity `LINKER_SELECTED`, terms locked (agreed_reward/deliverable) ✅
- Linker "My Proposals" dashboard page (`/dashboard/proposals`) ✅
- Build passes ✅

**Phase 5 (Transactions / Escrow):**
- Double-entry ledger helper (`src/lib/ledger.ts`) — balanced debit/credit pairs ✅
- Funding action records reward escrow + 10% activation fee via `transaction_ledger` ✅
- Reward release on completion with 3% linker service fee deducted (net payout) ✅
- Refund flow for failed/cancelled/expired opportunities ✅
- Payout + refund records; 7-day auto-release rule (cron-ready) ✅
- Wallet page (`/dashboard/wallet`) with balance, transactions, payouts, refunds ✅
- Build passes ✅

**Phase 6 (Connection + Completion + Trust):**
- Connection created on Linker selection; connection list + detail pages (`/dashboard/connections`) ✅
- Appointment proposal (Linker) + Seeker acknowledge/reject ✅
- Evidence submission by Linker with status review ✅
- Completion review → opportunity COMPLETED + schedules 7-day payout release ✅
- Extension request + failed-opportunity handling ✅
- Mutual ratings/reviews post-completion ✅
- Reputation metrics (success rate, avg rating) updated + shown on public profile ✅
- Build passes ✅

**Phase 7 (Admin / RBAC + Disputes):**
- RBAC helper + admin guard (`src/lib/rbac.ts`); role-scoped admin layout + sidebar (`/admin`) ✅
- Member management (search/suspend/reinstate/role), opportunity moderation (approve/flag/reject), restricted-category toggle ✅
- KYC status management (simplified): admin reviews `kyc_records` → sets `verification_status` + `verified_badge` on member profile; relationship verification queue ✅
- Dispute workflow (raise → payment hold → review → resolve: REFUNDED/FAILED → escrow→seeker; COMPLETED → escrow→linker net + 3%; PARTIALLY_COMPLETED → 50/50) ✅
- Audit trail (`audit_logs`) for financial + sensitive admin actions ✅
- Build passes ✅

**Phase 8 (Dashboard + Wallet + Polish) — FINAL MVP:**
- Role-aware Seeker+Linker dashboard hub (`/dashboard`) ✅
- Notifications (in-app, mark read), wallet top-up via ToyyibPay (Malaysian gateway, FPX+card, sandbox) ✅
- Public info pages (`/how-it-works`, `/fees`, `/trust-safety`, `/prohibited`) ✅
- Profile basic-details editing + avatar upload (Supabase storage bucket) ✅
- Build passes (26 routes). **MVP COMPLETE — ready for Malaysia/MYR pilot.**

---

## 7. Next Action

**MVP is feature-complete.** Remaining work is production hardening:
1. KYC hardening: liveness/selfie, expiry tracking, automated verification providers. (Member-facing doc upload + admin review + admin document preview are built.)
2. Live payment gateway (ToyyibPay sandbox → production keys, webhook tunnel for callback).
3. Fraud/risk scoring engine + advanced matching (Phase 2 marketplace intelligence).
4. Business accounts, multi-country, multi-currency(architecture-ready, not built).

---

## 8. Change Log

- **2026-09-18** — Created project plan + all phase docs (01–08). Phase 0 scaffold complete. Ready to start Phase 1.
- **2026-09-18** — Phase 1 complete: initial migration (26 tables), seed (admin + demo + orgs), register/login/logout with Supabase Auth + Prisma, `getCurrentUser()` with auto-provisioning (resolves redirect loop for existing Supabase users), route protection via `proxy.ts`. Build passes. Personal logo + icon integrated. Ready for Phase 2.
- **2026-09-18** — Phase 2 complete: dashboard sidebar layout, profile edit, employment history CRUD, relationship declarations (category/visibility/degree), business profiles + role toggle, public profile page (privacy-safe). Build passes. Ready for Phase 3.- **2026-09-24** — Phases 7 +  8 complete (admin/RBAC/disputes + dashboard/wallet/polish. MVP feature-complete. KYC is **simplified**: admin reviews `kyc_records` status → sets `verification_status` + `verified_badge` on the member profile; there is **no member-facing KYC submission flow** (no document upload/liveness) — full document KYC remains deferred. Wallet top-up wired to ToyyibPay sandbox.
- **2026-09-24** — Member-facing KYC submission flow added: `/dashboard/kyc` (upload identity doc → private `kyc-documents` bucket → PENDING `kyc_records` row → admin `/admin/kyc` review queue). Files: `src/app/actions/kyc.ts` (`submitKycAction`), `src/app/dashboard/kyc/` (page + `kyc-form.tsx`), `getKycRecordsByUser` query helper, `kyc-documents` storage bucket in schema SQL, "Verification" nav item. Build passes (27 routes).
- **2026-09-24** — Admin KYC document preview added: `/api/admin/kyc/[id]/document` (admin-guarded `kyc:read`, generates 60s signed URL for the private object and redirects). "View document" link in the admin KYC queue. Build passes (28 routes.
