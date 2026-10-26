# QA Docs

Testing and quality-assurance documentation for Jomlink.

| File | Purpose |
|------|---------|
| [`QA-CHECKLIST.md`](./QA-CHECKLIST.md) | **Manual QA checklist** — every user-facing function, the exact expected values, role/permission matrix, regression suite for bugs already fixed, and a bug log. Use this to run a full test pass before any release. |

## Quick start

1. Complete **Section 0 (Pre-flight)** — confirm all four migrations are applied
   and `tsc` / `npm test` / `npm run build` are clean.
2. Work the checklist top to bottom. Mark every row PASS / FAIL / BLOCKED / SKIP.
3. On any FAIL, capture route + role + steps + expected vs actual + screenshot +
   console/server errors, and file it in **Section 15 (Bug log)**.
4. Always re-run **Section 13 (Regression suite)** — those are bugs that were
   already found and fixed, and must not come back.
5. Section 14 lists **known gaps** (Phase 15 work) — mark these expected-fail,
   not FAIL.

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
signing, RBAC enforcement, money math end-to-end) must be verified manually via
this checklist.
