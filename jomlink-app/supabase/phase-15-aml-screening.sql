-- ============================================================================
-- Phase 15 · AML / KYC-before-payout (§11.9.2, LEG-04 / LEG-05)
-- ============================================================================
-- Idempotent. Safe to re-run. Apply in the Supabase SQL editor, then restart
-- the PostgREST container so the schema cache reloads.
--
-- WHY
--   Blueprint v1.2 §11.9.2 makes AML controls ENFORCED, not advisory:
--     1. screen sanctions / PEP / adverse media before any payout settles,
--     2. no money-out until identity verification is complete,
--     3. define monitoring thresholds,
--     4. record every screen immutably and attributably.
--
--   Before this migration a member with no KYC at all could request and be
--   paid a withdrawal, and `markPayoutPaidAction` never checked identity.
--
-- WHAT
--   `payments` rows (bank withdrawals) gain the screening state needed to hold
--   a payout pending Compliance clearance, plus who cleared it and why. The
--   immutable per-screen record itself lives in `audit_logs`
--   (PAYOUT_SCREEN_RECORDED / PAYOUT_SCREEN_BLOCKED / PAYOUT_COMPLIANCE_CLEARED);
--   these columns are the editable workflow state on the payout.
-- ============================================================================

alter table jomlink.payouts
  -- Screening verdict at the last check: CLEAR | REVIEW | BLOCKED.
  add column if not exists screen_risk         text,
  -- Machine-readable signal codes that fired (e.g. KYC_NOT_VERIFIED).
  add column if not exists screen_codes        text[],
  -- Screen definition / list version, so a past decision is reproducible.
  add column if not exists screen_list_version text,
  add column if not exists screened_at         timestamptz,
  -- Who cleared a REVIEW hold, and their recorded rationale (§11.9.2 rule 4).
  add column if not exists cleared_by          text,
  add column if not exists cleared_at          timestamptz,
  add column if not exists clearance_note      text;

-- A REVIEW hold must never be silently bypassed, so index the held state for
-- the Compliance queue.
create index if not exists payouts_screen_risk_idx
  on jomlink.payouts (screen_risk)
  where screen_risk in ('REVIEW', 'BLOCKED');

notify pgrst, 'reload schema';
