-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — FIX: enum transaction_type missing POSTING_DEPOSIT
-- Run this in Supabase → SQL Editor.
--
-- ERROR THIS FIXES:
--   invalid input value for enum transaction_type: "POSTING_DEPOSIT"  (22P02)
--
-- WHY: `create type jomlink.transaction_type as enum (...)` is a NO-OP on a
-- live DB where the type ALREADY existed (the DO/EXCEPTION catches
-- duplicate_object). So values added to the enum later — POSTING_DEPOSIT,
-- LISTING_FEE — were never applied to the live type.
--
-- This adds the missing values. Idempotent (safe to re-run).
--
-- ⚠️ Run this BEFORE posting any opportunity. Do NOT wrap it in a
--    begin/commit block: on PostgreSQL < 12, `ALTER TYPE ... ADD VALUE`
--    cannot run inside a transaction. The Supabase SQL editor runs the
--    statements as-is, so just paste §1 and Run.
-- ═══════════════════════════════════════════════════════════════

-- ── 0. WHICH values does the live enum currently have? (read-only) ─────────
select e.enumlabel as value
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'jomlink' and t.typname = 'transaction_type'
order by e.enumsortorder;


-- ── 1. ADD the missing values ──────────────────────────────────────────────
alter type jomlink.transaction_type add value if not exists 'POSTING_DEPOSIT';
alter type jomlink.transaction_type add value if not exists 'LISTING_FEE';
alter type jomlink.transaction_type add value if not exists 'WALLET_CREDIT';
alter type jomlink.transaction_type add value if not exists 'WALLET_DEBIT';


-- ── 2. VERIFY — all 10 values should now be present ───────────────────────
select e.enumlabel as value
from pg_enum e
join pg_type t on t.oid = e.enumtypid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'jomlink' and t.typname = 'transaction_type'
order by e.enumsortorder;

-- Expected:
--   OPPORTUNITY_FUNDING, POSTING_DEPOSIT, LISTING_FEE, ACTIVATION_FEE,
--   LINKER_SERVICE_FEE, REWARD_RELEASE, REFUND, PAYOUT, WALLET_CREDIT, WALLET_DEBIT
