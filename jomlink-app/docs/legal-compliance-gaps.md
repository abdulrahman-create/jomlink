# Jomlink — Legal & Compliance Gaps (for Malaysian counsel review)

**Version:** 1.0 · **Date:** 2026-10-15
**Status:** Open — blockers before any real-money pilot
**Blueprint ref:** `../JOMLINK PLATFORM BLUEPRINT v1.2.md` Part 11

> This document tracks **loopholes found by cross-checking the blueprint (v1.2) against
> the implemented code in `src/`** and against Malaysian law. It is a working checklist
> for Malaysian counsel and the payment provider, **not a legal opinion**. Each item maps
> to a blueprint risk-register ID and an implementation phase (see
> `phase-15-compliance-hardening.md`).

---

## 1. Critical — implementation contradicts the blueprint's own Part 11

### G-1 · Government & Investor categories are NOT disabled (only flagged)
- **Blueprint rule:** §11.8 / §11.9 / §11.9.1 — `GOVERNMENT_PUBLIC_SECTOR` and
  `INVESTOR_CONNECTION` are **disabled by default** until legal review.
- **What the code does:** `src/app/actions/opportunities.ts` sets
  `is_restricted_category: true` and `confidentiality: "RESTRICTED"` for
  `GOVERNMENT_PUBLIC_SECTOR`, but **still charges the posting deposit and publishes it**.
  `INVESTOR_CONNECTION` has **no restriction at all** (`constants.ts`, `matching.ts`).
- **Legal exposure:** bribery/gratification (MACC Act 2009 ss.16–18, corporate liability
  s.17A) and unlicensed investment activity (Securities Commission Malaysia).
- **Risk ID:** `LEG-02`, `LEG-03`, `LEG-06` (Blocker).
- **Fix:** server-side category deny-list (see `phase-15-compliance-hardening.md` §1).

### G-2 · Phase 14 verification-gated release migration NOT applied
- **What it means:** `supabase/phase-14-verification-gated-release.sql` is ⚠️ NOT APPLIED.
  The enum values (`EVIDENCE_SUBMITTED`, `AWAITING_SEEKER_CONFIRMATION`, `VERIFIED`) and 9
  `connections` columns do not exist in the live DB, so the "Seeker confirms → platform
  verifies → platform releases" state machine **cannot run**. The platform silently reverts
  to the pre-Phase-14 self-certifying release.
- **Risk ID:** `FIN-02` (Blocker).
- **Fix:** apply the migration; then verify the sweep routes are wired to a scheduler.

### G-3 · Payment gateway does not provide a marketplace/escrow product
- **What it is:** `src/lib/toyyibpay.ts` implements `createBill` (a simple FPX/card
  checkout) and `getBillTransactions`. It has **no native hold / split / refund-to-second-
  party / payout-to-different-party** marketplace capability.
- **Legal exposure:** the platform would manually hold and re-distribute client money,
  which §11.3 expressly forbids without provider confirmation and counsel opinion.
- **Risk ID:** `LEG-01`, `FIN-01` (Blocker).
- **Action:** obtain written confirmation from ToyyibPay (or switch provider) that the
  precise marketplace flow is supported; otherwise scope the MVP to a non-custodial model.

---

## 2. High — Malaysian-law gaps Part 11 does not fully close

### G-4 · MACC Act 2009 s.17A "adequate procedures" not mandated
- Jomlink monetises access to decision-makers. A contingent reward for securing a meeting
  that leads to a contract/tender can be characterised as "gratification". Under **s.17A
  corporate liability**, Jomlink is liable unless it can show **adequate procedures**.
- **Gap:** Part 11 flags bribery risk but does **not** require a named adequate-procedures
  framework aligned to the Prime Minister's Office **T.R.U.S.T.** guidelines (Top-level
  commitment, Risk assessment, Undertake controls, Systematic review, Training & communication).
- **Action:** produce a s.17A adequate-procedures framework as a launch deliverable.

### G-5 · AML/CFT (AMLATFA 2001) — no screening on payouts
- The bank-withdrawal flow (`src/app/actions/admin.ts` → `markPayoutPaidAction`) has **no
  sanctions/PEP/adverse-media screening** and **no KYC gate** before money-out. A member with
  only email+mobile verification can receive and withdraw funds.
- **Risk ID:** `LEG-04`, `LEG-05` (Blocker).
- **Action:** implement §11.9.2 controls (KYC-before-payout, sanctions screen, monitoring).

### G-6 · PDPA 2010 (as amended 2024) — DPO, breach notification, portability
- The 2024 amendment introduces mandatory **DPO** appointment (for prescribed classes),
  **mandatory breach notification**, **direct processor obligations**, and **data
  portability**. §11.11 previously framed DPO as "assess whether required"; it should be
  treated as a dated mandatory deliverable once commencement applies.
- **Action:** trigger analysis + DPO appointment/registration; breach runbook aligned to
  72-hour notification.

### G-7 · PDPA — biometric secondary use + missing purge job
- The KYC biometric pipeline (`docs/kyc-biometric-data.md`) collects **face + ID images**
  (sensitive personal data). Two defects:
  1. The **retention/purge job is not implemented** — `purge_requested_at` rows are never
     actually deleted (breach of retention limitation / right to erasure).
  2. Using captures to **train a face-match model is a separate secondary purpose** needing
     its own specific consent — a single KYC checkbox is insufficient.
- **Risk ID:** `PRIV-01` (Before pilot).
- **Action:** implement purge job + separate secondary-use consent.

### G-8 · Contracts Act 1950 — deliverable must be "introduction", not contingent success fee
- Enforceability of the escrow release depends on the reward being consideration for a
  **service (the introduction)**, not a contingent "success fee". A reward functionally
  tied to "the meeting led to a deal" risks being void for uncertainty (s.30) or treated as
  a wagering/contingency arrangement.
- **Action:** ensure Terms and the opportunity schema mirror "introduction only" framing;
  review with counsel.

### G-9 · Consumer Protection Act 1999 / e-commerce terms
- The RM10 non-refundable listing fee, "deposit consumed on completion" rule, and
  auto-refund/expiry rules are consumer-contract terms if parties are individuals.
- **Action:** unfair-contract-terms review of the fee/deposit/cancellation terms.

### G-10 · Tax / SST on fees
- No tracked decision on who issues invoices or whether fees are tax-inclusive (SST on
  digital services).
- **Action:** document the contracting supplier, invoice issuer, and indirect-tax treatment.

---

## 3. Medium — residual blueprint gaps

- **G-11 · Multiple-Linker isolation (FIN-05):** no concurrency guard (unique constraint /
  optimistic lock) proves two Seekers cannot both select-and-fund against one shared reward.
- **G-12 · Stale RM 2,200 escrow:** documented unresolved in `PROJECT-TRACKING.md`; breaches
  the §11.5 reconciliation invariant. Resolve before audit.
- **G-13 · Terms versioning not enforced in code (LEG / §11.10):** no `terms_acceptances`
  table wired to transaction acceptance; material changes need re-acceptance.
- **G-14 · No target-acknowledgement mechanism (OPS-01):** the risk scorer penalises its
  absence, but no code generates/collects the target confirmation link — every meeting-type
  completion is permanently HIGH risk.

---

## 4. Priority / sequencing

| # | Gap | Blocker? | Phase ref |
|---|-----|----------|-----------|
| 1 | G-1 category deny-list | Yes | Phase 15 §1 |
| 2 | G-2 apply Phase 14 migration | Yes | Phase 15 §0 |
| 3 | G-3 provider marketplace flow | Yes | counsel + provider |
| 4 | G-5 AML/KYC-before-payout | Yes | Phase 15 §2 |
| 5 | G-7 biometric purge + consent | Yes | Phase 15 §3 |
| 6 | G-4 s.17A adequate procedures | High | compliance doc |
| 7 | G-11/G-12 concurrency + stale escrow | High | Phase 15 §4 |
| 8 | G-6 PDPA 2024 (DPO/breach/portability) | High | counsel + compliance |
| 9 | G-8/G-9/G-10 contracts/consumer/tax | High | counsel |
| 10 | G-13/G-14 terms versioning + target ack | Medium | later phase |
