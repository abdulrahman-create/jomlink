# Phase 5 — Transactions / Escrow

**Status:** ✅ Done · **Depends on:** Phase 4 ✅

---

## Goals

1. Implement the **transaction engine**: funding, escrow holding, fees, refunds, payouts.
2. Model the **10% refundable posting deposit** (Seeker, charged at post time, less a flat **RM10 non-refundable listing fee** if cancelled before Linker selection) and the **10% service fee** (Linker).
3. Implement **full reward settlement** at Linker acceptance (reward held in escrow).
4. Implement the **7-day auto-release** after completion.
5. Keep a **double-entry transaction ledger** for auditability.

---

## Scope

### In scope
- Wallet / escrow balance model
- **10% posting deposit** auto-deducted from the Seeker's wallet at post time (refundable less the RM10 listing fee if cancelled before Linker selection; consumed once a Linker is selected)
- **Full reward settlement** at Linker acceptance — reward deducted from wallet and held in escrow
- Transaction ledger (debit/credit entries)
- Reward release on verified completion
- 10% Linker service fee deduction on payout
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
- [x] Posting an opportunity deducts the 10% deposit and creates correct ledger entries
- [x] Accepting a Linker settles the full reward into escrow
- [x] Completion → payout with 10% fee deducted, net to Linker
- [x] Failed opportunity → reward refunded to Seeker (deposit refunded separately, less the listing fee, when cancelled before Linker selection)
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
- [ ] 5.3 Reward release + 10% service fee
- [ ] 5.4 Refund flow
- [ ] 5.5 7-day auto-release
- [ ] 5.6 Wallet page
- [ ] 5.7 Clean build + test

---

## Key Business Rules (blueprint §3.9, §5.7, §10)

- Seeker pays a **10% posting deposit** (of the reward) at post time, auto-deducted from their wallet. Cancelling **before a Linker is selected** refunds the deposit **less the RM10 non-refundable listing fee**; once a Linker is selected the deposit is consumed.
- A Seeker **cannot post** unless their wallet holds sufficient credit for the 10% deposit. Seekers may post **unlimited** Opportunities while credit allows.
- The **reward is not charged at posting**. The Seeker must have **full settlement of the reward** available when they **accept a Linker's submission**; the reward is then deducted and held in escrow.
- Reward held in escrow until verified completion.
- Linker pays **10% service fee** on payout.
- Failed opportunity → **reward** returned to Seeker; the **posting deposit** is refunded only for a pre-selection cancellation (less the listing fee).
- Currency conversion must never overwrite original transaction value (future).