# Phase 8 — Dashboard + Wallet + Polish

**Status:** ✅ Complete · **Depends on:** Phases 1–7 ✅

---

## Goals

1. Build the member **dashboard** as the central hub (Seeker + Linker views).
2. Implement the **wallet** experience over the Phase 5 transaction engine.
3. Polish the public pages (how-it-works, about, fees, trust & safety).
4. Accessibility & responsive audit, empty states, loading skeletons.

---

## Scope

### In scope
- Seeker dashboard: my opportunities, proposals received, statuses, actions
- Linker dashboard: opportunities to apply, my proposals, active connections, earnings
- Wallet page: balance, transactions, pending escrow, payouts
- Notifications center (in-app)
- Public info pages (How it works, Fees, Trust & Safety, Prohibited activities)
- Empty states + loading states
- Accessibility (WCAG AA) + responsive review (375px–1440px)
- SEO meta on key pages

### Out of scope (later phases)
- Mobile apps
- Business/team accounts
- Advanced analytics
- Multi-country/multi-currency rollout

---

## Definition of Done

- [x] `npm run build` passes
- [x] Dashboards show accurate live data for both roles
- [x] Wallet reflects ledger + escrow + payouts
- [x] Notifications surface key events
- [x] Public info pages complete
- [x] Passes basic accessibility + responsive checks

---

## Files involved
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/wallet/page.tsx`
- `src/app/(dashboard)/notifications/page.tsx`
- `src/app/how-it-works/page.tsx`
- `src/app/fees/page.tsx`
- `src/app/trust-safety/page.tsx`
- `src/app/prohibited/page.tsx`

---

## Tasks

- [x] 8.1 Seeker dashboard
- [x] 8.2 Linker dashboard
- [x] 8.3 Wallet page
- [x] 8.4 Notifications center
- [x] 8.5 Public info pages
- [x] 8.6 Accessibility + responsive audit
- [x] 8.7 Empty/loading states
- [x] 8.8 Clean build + test

---

## Notes
This is the final MVP polish phase. After this, the platform is MVP-complete and ready for a controlled market pilot (Malaysia, MYR).

---

## Update — 2026-10-12 · Wallet layout & bank withdrawals

**Wallet layout fixed.** The wallet's left (2/3) column held only the two short
stat tiles (Balance, Pending escrow), leaving a large empty gap, while
**"Withdraw to bank"** sat at the bottom of the tall right-hand column — so the
most important member action was below the fold. The **Withdraw to bank** panel
is now in the **left column directly beneath the Balance / Pending escrow tiles**;
the right column keeps the secondary items (Top up, Total topped up, Incoming
payouts). Nothing scrolls to reach the withdrawal form.

**New wallet tiles / panels.**
- **Incoming payouts** tile — net `linkerPayout` of the member's unreleased
  connections + next release date (see `phase-05-transactions.md`).
- **Withdraw to bank** panel (`payout-request-panel.tsx`) — save bank account,
  request a withdrawal of the available balance, see a pending request. Requires
  the `phase-payout-request.sql` migration.

**Payouts list** now distinguishes **Bank withdrawal** vs **Reward payout** and
shows paid dates. Wallet balance treats `WITHDRAWAL` as an out.

**Admin surface.** New **Withdrawal requests** tab on
`/admin/transactions?tab=requests` with a **Mark as paid** action (see
`phase-07-admin.md` conventions — permission `finance:payout`).
