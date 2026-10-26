# QA Docs

Testing and quality-assurance documentation for Jomlink.

| File | Purpose |
|------|---------|
| [`QA-CHECKLIST.md`](./QA-CHECKLIST.md) | **Manual QA checklist** — every user-facing function, the exact expected values, role/permission matrix, UI/UX + copy-accuracy + API-security coverage, a regression suite for bugs already fixed, and a bug log. Use this to run a full test pass before any release. |

## Quick start

1. Complete **Section 0 (Pre-flight)** — confirm all migrations are applied and
   `tsc` / `npm test` / `npm run build` / `npm run lint` are clean. The section also
   carries the **blueprint v1.2 → implementation traceability matrix**.
2. Work the checklist top to bottom. Mark every row PASS / FAIL / BLOCKED / SKIP.
3. On any FAIL, capture route + role + steps + expected vs actual + screenshot +
   console/server errors, and file it in **Section 19 (Bug log)**.
4. Always re-run **Section 17 (Regression suite)** — those are bugs that were
   already found and fixed, and must not come back.
5. Section 18 lists **known gaps** (Phase 15/16 work) — mark these expected-fail,
   not FAIL.

## Section map

| § | Area |
|---|------|
| 0 | Pre-flight + blueprint gap matrix |
| 1–11 | Feature flows: auth, profile, KYC, marketplace, proposals, money, connection lifecycle, disputes, deadlines, notifications, admin/RBAC |
| 12 | Cross-cutting security (IDOR, XSS, injection, money integrity) |
| **13** | **UI/UX & design system** — brand, typography, responsive, a11y, money presentation |
| **14** | **Public pages & copy accuracy** — landing, `/fees`, `/how-it-works`, `/prohibited`, `/trust-safety` |
| **15** | **Business profile & account role** — `/dashboard/business` |
| **16** | **API & scheduled-endpoint security** — sweep/cron auth, webhooks, signed-URL routes |
| 17 | Regression suite |
| 18 | Known gaps (expected-fail) |
| 19 | Bug log |
| 20 | Sign-off |

## Automation

The checklist complements, and does not replace, the existing unit tests:

```
src/lib/status.test.ts             # lifecycle predicates (fail-closed guards)
src/lib/verification.test.ts       # verification-gated release rules
src/lib/extensions.test.ts         # deadline-extension flow
src/lib/negotiation.test.ts        # proposal negotiation
src/lib/deadline-warnings.test.ts  # deadline warning windows
src/lib/notification-links.test.ts # notification deep-link targets
```

Run them with `npm test`. Anything not covered there (DB writes, RLS, storage
signing, RBAC enforcement, money math end-to-end, and all visual/copy checks)
must be verified manually via this checklist.

## Recently found — worth fixing

Found while aligning this checklist with blueprint **v1.2** (2026-10-26). All three
are **UI/UX or copy defects**, not logic bugs, and are tracked in §13/§14/§17:

| Finding | Row | Severity |
|---|---|---|
| Landing-page search box has **no `action`, no `name`, no handler** — clicking "Search Marketplace" does nothing | 4.19 | P2 |
| Landing page advertises **hard-coded** "240+ / 180+ ..." opportunity counts with no real inventory, including the **restricted** Investor and Government categories | 14.3, 14.4 | P2 |
| `/how-it-works` and `/fees` still describe **pre-Phase-14** behaviour ("10% activation fee", "fund it into escrow" at posting, "released the moment you mark it complete") | 14.5, 14.6 | P2 |
