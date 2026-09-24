# Phase 5 — Transactions / Escrow

**Status:** ✅ Done · **Depends on:** Phase 4 ✅

---

## Goals

1. Implement the **transaction engine**: funding, escrow holding, fees, refunds, payouts.
2. Model the **10% activation fee** (Seeker) and **3% service fee** (Linker).
3. Implement the **7-day auto-release** after completion.
4. Keep a **double-entry transaction ledger** for auditability.

---

## Scope

### In scope
- Wallet / escrow balance model
- Opportunity funding transaction (reward + 10% activation fee)
- Transaction ledger (debit/credit entries)
- Reward release on verified completion
- 3% Linker service fee deduction on payout
- Refund mechanism (failed opportunity → reward + applicable fee back to Seeker)
- Payout record for Linker
- 7-day auto-release scheduling (computed / cron-ready)
- Payment gateway **stubbed** (sandbox reference, no real money)

### Out of scope (later phases)
- Real payment gateway integration (Stripe/FPX/etc.)
- Multi-currency conversion
- Corporate billing / shared wallets

---

## Definition of Done

- [x] `npm run build` passes
- [x] Funding an opportunity creates correct ledger entries (reward + 10% fee)
- [x] Completion → payout with 3% fee deducted, net to Linker
- [x] Failed opportunity → refund to Seeker
- [x] 7-day auto-release logic implemented (cron-ready, FEES.RELEASE_WAIT_DAYS)
- [x] All money movement is traceable via `transaction_ledger`

---

## Files involved
- `src/lib/funding.ts` — fee/escrow math
- `src/lib/ledger.ts` — double-entry helpers
- `src/app/actions/transactions.ts`
- `src/app/actions/payouts.ts`
- `src/app/actions/refunds.ts`
- `src/app/(dashboard)/wallet/page.tsx`

---

## Tasks

- [ ] 5.1 Funding + activation fee
- [ ] 5.2 Ledger double-entry helper
- [ ] 5.3 Reward release + 3% service fee
- [ ] 5.4 Refund flow
- [ ] 5.5 7-day auto-release
- [ ] 5.6 Wallet page
- [ ] 5.7 Clean build + test

---

## Key Business Rules (blueprint §3.9, §10)

- Seeker pays **10% of reward** as activation/security fee at publish.
- Reward held in escrow until verified completion.
- Linker pays **3% service fee** on payout.
- Failed opportunity → reward returned to Seeker + applicable fee refund.
- Currency conversion must never overwrite original transaction value (future).