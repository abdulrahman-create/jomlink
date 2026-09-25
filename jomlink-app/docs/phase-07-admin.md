# Phase 7 — Admin / RBAC + Disputes

**Status:** ✅ Complete · **Depends on:** Phases 5–6 ✅

---

## Goals

1. Build the **role-based admin system** (Super, Operations, KYC, Finance, Dispute, Compliance, Support).
2. Implement **essential admin functions**: member management, opportunity moderation, KYC status, transactions, disputes.
3. Implement **dispute management** workflow (raise → hold → review → resolve).
4. Add a basic **audit trail** for sensitive/financial admin actions.

---

## Scope

### In scope
- Admin role model + permission checks (RBAC)
- Admin dashboard (`/admin`) with role-scoped views
- Member search / view / suspend / reinstate
- Opportunity moderation (approve / flag / reject), restricted category control
- KYC status management (simplified)
- Transaction & payout overview
- Dispute raise → payment hold → review → resolution
- Audit log recording (financial + sensitive actions)
- Admin MFA flag + stronger session expectations

### Out of scope (later phases)
- Fraud scoring / risk signals engine
- Full document verification
- Bulk/complex compliance tools

---

## Definition of Done

- [x] `npm run build` passes
- [x] Only admins can access `/admin`; scoped by role
- [x] Admin can view/suspend members
- [x] Admin can moderate opportunities
- [x] Dispute can be raised, money held, and resolved
- [x] Audit trail is written for key actions

---

## Files involved
- `src/app/admin/**`
- `src/lib/rbac.ts` — permission checks
- `src/app/actions/admin.ts`
- `src/app/actions/disputes.ts`

---

## Tasks

- [x] 7.1 RBAC helper + admin guard
- [x] 7.2 Admin layout + sidebar
- [x] 7.3 Member management
- [x] 7.4 Opportunity moderation
- [x] 7.5 KYC status management
- [x] 7.6 Dispute workflow
- [x] 7.7 Audit log
- [x] 7.8 Clean build + test

---

## KYC Implementation Note (2026-09-24)

KYC is **simplified** in the MVP — status + badge only, per the confirmed technical decision:

- **Schema:** `kyc_records` table (user_id, status, document_type, document_ref, reviewed_by, reviewed_at, expiry_date, notes).
- **Admin flow:** `/admin/kyc` — admin reviews a `kyc_records` row and approves/rejects. On approve, `reviewKycAction` sets the member profile's `verification_status = VERIFIED` and `verified_badge = true` (and the reverse on reject). Audit log written (`KYC_APPROVED` / `KYC_REJECTED`).
- **Relationship verification:** same page, second tab — admin reviews declared `relationships` (sets `verification_status` + `verified`).
- **Member-facing submission (added 2026-09-24):** `/dashboard/kyc` — a member uploads an identity document (JPEG/PNG/WebP/PDF, ≤10 MB) to the private `kyc-documents` storage bucket and `submitKycAction` creates a `PENDING` `kyc_records` row. The page shows current status + submission history. Nav item "Verification" added to the dashboard sidebar.
- **Document storage:** `kyc-documents` bucket is **private** (public=false) — docs are addressed by path only and read server-side via the service-role client; never publicly served. `kyc_records.document_ref` stores the object path (not a public URL.
.
- **Admin document preview (added 2026-09-24):** `/api/admin/kyc/[id]/document` — admin-guarded route (`kyc:read`) that generates a 60-second signed URL for the private object and redirects to it. "View document" link shown in the admin KYC queue. Service-role key never leaves the server.

- **Badge display:** `verified_badge` shows as a "Verified" badge on the dashboard header, dashboard identity card, and public member profile.

**Deferred (production hardening):** liveness/selfie, expiry tracking, automated verification providers.

- **RBAC** — no unrestricted internal access.
- Government category is **restricted**; no guaranteed approvals/tenders.
- Dispute → **payment hold** → evidence review → resolution.
- Audit actions are **tamper-resistant** and retained.