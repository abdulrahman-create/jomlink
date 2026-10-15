# Phase 5 — Transactions / Escrow

**Status:** ✅ Done · **Depends on:** Phase 4 ✅

---

## Goals

1. Implement the **transaction engine**: funding, escrow holding, fees, refunds, payouts.
2. Model the **10% refundable posting deposit** (Seeker, charged at post time, less a flat **RM10 non-refundable listing fee** if cancelled before Linker selection) and the **10% service fee** (Linker).
3. Implement **full reward settlement** at Linker acceptance (reward held in escrow).
4. Release the reward **immediately on completion** (see the 2026-10-15 update below); a **7-day fallback** pays out a completed-but-unreleased connection.
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
- **7-day fallback** auto-release sweep (cron-ready) for a completed-but-unreleased connection
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
- [x] Reward released **immediately on completion**; **7-day fallback** sweep implemented (cron-ready, FEES.RELEASE_WAIT_DAYS)
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

- [x] 5.1 Funding + activation fee
- [x] 5.2 Ledger double-entry helper
- [x] 5.3 Reward release + 10% service fee
- [x] 5.4 Refund flow
- [x] 5.5 Auto-release (immediate on completion + 7-day fallback)
- [x] 5.6 Wallet page
- [x] 5.7 Clean build + test

---

## Key Business Rules (blueprint §3.9, §5.7, §10)

- Seeker pays a **10% posting deposit** (of the reward) at post time, auto-deducted from their wallet. Cancelling **before a Linker is selected** refunds the deposit **less the RM10 non-refundable listing fee**; once a Linker is selected the deposit is consumed.
- A Seeker **cannot post** unless their wallet holds sufficient credit for the 10% deposit. Seekers may post **unlimited** Opportunities while credit allows.
- The **reward is not charged at posting**. The Seeker must have **full settlement of the reward** available when they **accept a Linker's submission**; the reward is then deducted and held in escrow.
- Reward held in escrow until verified completion, then **released immediately** when the Seeker marks the connection complete (the 7-day window is a fallback safety net only — see §5.7 Escrow Release Model in the blueprint).
- Linker pays **10% service fee** on payout.
- Failed opportunity → **reward** returned to Seeker; the **posting deposit** is refunded only for a pre-selection cancellation (less the listing fee).
- Currency conversion must never overwrite original transaction value (future).

---

## Update — 2026-10-15 · Escrow release is immediate on completion (Option A)

**Problem.** Completing a connection and releasing the reward were two separate
actions on two different pages ("Mark complete" on the connection page;
"Release reward" on the opportunity page). After marking complete, the Seeker's
wallet still showed the reward as *Pending escrow* and the Linker saw no payout —
the money only moved if the Seeker found and pressed the second button. The
blueprint's §5.16 / §5.17 flows describe a **single** "Payment Release" step, so
the two-step UI was a bug, not a design.

**Decision (Option A).** The reward is released **immediately** when the Seeker
marks the connection complete. The 7-day window is now a **fallback only** — a
safety net that pays out a completed connection that was somehow never released,
and a window in which a dispute can freeze the escrow. It is **never** the
payment date. This is now defined authoritatively in the blueprint at
**§5.7 — Escrow Release Model**.

**Code changes:**

- **New `src/lib/release.ts`** — `settleRewardRelease()`, the single money-movement
  path (escrow → Linker reward, Linker → platform 10% fee, COMPLETED payout
  record). Extracted out of the `"use server"` action file so it can be called
  from any server action without being exposed as its own endpoint. Shared by
  the completion action, the legacy manual release action, and the sweep.
- **`markConnectionCompleteAction`** (`src/app/actions/completions.ts`) now
  calls `settleRewardRelease()` and sets `release_status = "RELEASED"` in the
  same action. Idempotent — it skips a connection already
  `RELEASED`/`REFUNDED`/`VOID`/`HELD`. If the release call fails, the connection
  is still completed with `release_status = "PENDING_RELEASE"` so the 7-day
  fallback sweep recovers it, and the error is logged loudly. The Linker is
  notified with the released amount (or the fallback date, if the release failed).
- **`runAutoReleaseCheck`** (`src/app/actions/transactions.ts`) is now documented
  and treated as the **fallback** sweep; it still drains any `PENDING_RELEASE`
  rows (including legacy rows from the pre-Option-A flow).

**UI changes:**

- Connection page: the completion button now reads **"Mark complete & release
  reward"** (was "…schedule release (7 days)"), with a hint that completion
  releases the reward. The Reward & payout card frames `auto_release_at` as a
  fallback date, not the payment date.
- Opportunity page: the manual "Release reward" card is now a **recovery action**
  only — it renders only when the connection is completed **and not yet settled**
  (hidden once `release_status` is RELEASED/REFUNDED/VOID/HELD).
- Wallet + public pages (`/fees`, `/how-it-works`): copy updated to say the
  reward releases **on completion**, with the 7-day window described as a safety
  net.

No schema change. `npm run build` / tsc + 67 vitest tests pass.

---

## Update — 2026-10-12 · Payout visibility & bank withdrawals

Two money-path gaps closed after Phase 13: nobody could see **what the Linker
would actually be paid, or when**, and **neither party could move wallet money
out**.

### 1. Payout visibility (Linker "how much / when")

- **Connection page — Reward & payout card**
  (`src/app/dashboard/connections/[id]/page.tsx`): shows the reward held in
  escrow (`connection.agreed_reward ?? opportunity.offer_amount`), the Linker's
  **net take-home** (`computeFunding(reward).linkerPayout` = reward − 10%
  `LINKER_SERVICE_FEE_RATE`), and a **state-driven release line**:
  - **paid** (`release_status = RELEASED`) → net + released date;
  - **fallback** → `connection.auto_release_at` (set at completion =
    `completedAt + FEES.RELEASE_WAIT_DAYS`) — the date the fallback sweep would
    pay, NOT the normal payment date (release is immediate on completion);
  - **held** (dispute, `HELD` / connection `DISPUTED`);
  - **refunded / void** (`REFUNDED` / `VOID`, or connection `FAILED`);
  - else → "releases on completion, with a fallback safety net".
- **Wallet — Incoming payouts tile**: sums the net `linkerPayout` of the member's
  connections not yet released/refunded/held/failed and shows the **next release
  date**. (Derived from `connections`, because a `payouts` row is only created
  **at** release.)

### 2. Bank withdrawal requests (member → admin-settled)

Members withdraw their **available (settled) wallet balance** to a saved bank
account; an admin settles it. **Reuses `jomlink.payouts`** (no new table): a
request is a payout row with `status = PENDING`, `method = BANK_TRANSFER`,
`service_fee = 0`.

- **Migration** — `supabase/phase-payout-request.sql` :
  - `users.bank_name` / `bank_account_no` / `bank_account_name` (text);
  - `payouts.requested_at` / `approved_by` / `note`;
  - `transaction_type` gains `WITHDRAWAL` (added to the enum **and** the §1b
    self-heal `alter type ... add value if not exists` block).
- **Member actions** (`src/app/actions/payouts.ts`):
  - `updateBankDetailsAction` — validates bank name / account no (digits, spaces,
    dashes) / holder name; saves to the user row.
  - `requestPayoutAction` — requires bank details on file, amount ≤ balance,
    **one open request at a time**; creates a **PENDING `WITHDRAWAL` transaction**
    (the payout row's `transaction_id` anchor) + the payout row; audits
    `PAYOUT_REQUESTED` and notifies the member.
- **Admin action** (`src/app/actions/admin.ts`): `markPayoutPaidAction`
  (perm **`finance:payout`**) — idempotent on already-`PAID`; re-checks the
  balance; sets the `WITHDRAWAL` transaction `COMPLETED`; ledger
  `wallet:{id} → external:payout`; flips the payout to `PAID` with `released_at`
  + `approved_by`; audits `PAYOUT_PAID` and notifies the member.
- **Queries** (`src/lib/queries.ts`): `getPayoutById`, `updatePayout`,
  `listPendingPayoutRequestsAdmin` (joins member names **and** bank details),
  `updateBankDetails`.
- **UI**: wallet `payout-request-panel.tsx` (bank form + withdraw form + pending
  state); admin `/admin/transactions?tab=requests` with a **Mark as paid** button.
- **Wallet balance integrity**: `getWalletBalance` and the wallet page treat
  `WITHDRAWAL` as an **OUT**, so the balance drops after settlement. The wallet is
  **not** debited at request time — only at settlement — so an un-actioned
  request never drains the balance.
- **Notifications**: `PAYOUT_REQUESTED` / `PAYOUT_PAID` route via the existing
  `PAYOUT*` prefix in `src/lib/notification-links.ts` (admin → `/admin/transactions`,
  member → `/dashboard/wallet`).

> ⚠️ **Not real money yet.** Settlement records the ledger movement but performs
> no bank/FPX disbursement — it is the same stubbed-gateway situation as top-ups.
> See `PROJECT-TRACKING.md` → *Known gaps* #11.
