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

## Key Business Rules (blueprint §9)

- **RBAC** — no unrestricted internal access.
- Government category is **restricted**; no guaranteed approvals/tenders.
- Dispute → **payment hold** → evidence review → resolution.
- Audit actions are **tamper-resistant** and retained.