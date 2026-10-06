# Jomlink — Project Tracking Board

**Updated:** 2026-10-06 · **Build status:** ✅ `npm run build` passes

Single-page status view. Narrative detail lives in `00-project-plan.md` and the
per-phase docs; this file answers *"where are we, what's next, what's blocking"*
at a glance.

---

## Phase status

| Phase | Focus | Status | Doc |
|-------|-------|--------|-----|
| 0 | Foundation / scaffolding | ✅ Done | — |
| Plan | Project planning documentation | ✅ Done | `00-project-plan.md` |
| 1 | DB migrate + seed + auth flow | ✅ Done | `phase-01-auth.md` |
| 2 | Member profile + relationships | ✅ Done | `phase-02-profile.md` |
| 3 | Opportunity marketplace + matching | ✅ Done | `phase-03-marketplace.md` |
| 4 | Linker proposals + negotiation | ✅ Done | `phase-04-proposals.md` |
| 5 | Transactions / escrow | ✅ Done | `phase-05-transactions.md` |
| 6 | Connection + completion + trust | ✅ Done | `phase-06-connection.md` |
| 7 | Admin / RBAC + disputes | ✅ Done | `phase-07-admin.md` |
| 8 | Dashboard + wallet + polish | ✅ Done | `phase-08-dashboard.md` |
| 9 | Deadline + progress thread + yellow flag | ✅ Done | `phase-09-deadline-progress.md` |
| 10 | Notifications + navigation + guards | ✅ Done | `phase-10-notifications-nav-guards.md` |

**MVP is feature-complete.** Remaining work is production hardening (below).

---

## Outstanding migrations


## Known gaps & follow-ups

Ordered by risk to the pilot, not by effort.

| # | Item | Severity | Notes |
|---|------|----------|-------|
| 1 | **Extension is unilateral** | 🟠 High | A Linker self-approves an extension, which also **auto-clears their own yellow flag** and pushes their escrow release date. The extension does nothing to constrain the party it is meant to hold accountable. Consider Linker-requests / Seeker-approves, mirroring the deadline flow. |
| 2 | Notification delivery is **in-app only** | 🟡 Medium | `notification_channel` supports EMAIL/SMS/PUSH; no worker sends them. Members must open the app to learn anything. |
| 3 | Live payment gateway | 🟡 Medium | ToyyibPay is sandbox-only; production keys + webhook tunnel still needed. |
| 4 | KYC hardening | 🟡 Medium | Status + badge + document upload + admin review exist. No liveness/selfie check, no document expiry, no automated provider. |
| 5 | No admin evidence queue | ⚪ Low | Only needed if evidence moderation is actually wanted. Would require an `evidence:write` permission, an `/admin/evidence` page and a review action. The `approved` column is reserved for this. |
| 6 | Fraud / risk scoring | ⚪ Low | Repeated yellow flags are already recorded and can feed an engine. |
| 7 | Business accounts, multi-country, multi-currency | ⚪ Low | Architecture-ready, not built. |

---

## Recurring bug pattern (worth watching)

Four of the five bugs fixed in Phase 10 were invisible in code review and only
appeared by **using the app**. They share one shape:

> **The UI offers a state the backend never reaches, or an action at the wrong
> point in the lifecycle — and the server has no guard.**

| Instance | UI offered | Reality |
|----------|-----------|---------|
| `[id]` back-link → `/dashboard` | A "parent" that skips a level | Hierarchy was dashboard → list → detail |
| Extension form on `COMPLETED` | An action on a closed job | No status guard in the action |
| Review form after reviewing | A form that always errors | Server rejected, UI never checked |
| Evidence "Pending review" | A verdict that would arrive | No code path ever set `approved` |

**Rule of thumb when adding an action:** check that (a) the UI's visibility
condition matches the lifecycle state the action is valid for, (b) the server
enforces the same rule rather than trusting the UI, and (c) any state the UI
*displays* is actually reachable somewhere in the codebase. Searching for the
column/field name is the fastest way to prove (c).

---

## Conventions

- **One phase at a time.** Read the phase doc before starting; mark it done in
  `00-project-plan.md` when its *Definition of Done* is met.
- **Every phase is production-build-clean** (`npm run build` passes) before moving on.
- **Never expose `SERVICE_ROLE_KEY`** to the browser. Private files are served via
  server-side signed URLs (`/api/admin/kyc/[id]/document`, `/api/evidence/[id]`).
- **Notifications are best-effort** — use `src/lib/notify.ts`; never let a
  notification failure roll back the business action.
- **Business data lives in the isolated `jomlink` schema** (not `public`); auth
  users are tagged `app='jomlink'`.
- **Privacy by design** — relationship data must never leak personal contacts.

> Source of truth for the product: `../JOMLINK PLATFORM BLUEPRINT v1.md`.
