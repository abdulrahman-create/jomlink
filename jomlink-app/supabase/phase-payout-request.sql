-- ═══════════════════════════════════════════════════════════════════════════
-- Jomlink — Bank payout request (Linker & Seeker)
-- ═══════════════════════════════════════════════════════════════════════════
-- Standalone, idempotent migration for the member-withdrawal feature:
--   • Members save a bank account (bank name / account no / account holder).
--   • Members request a withdrawal of their available wallet balance.
--   • Admins settle the request (mark paid) from /admin/transactions?tab=payouts.
--
-- Reuses the existing `jomlink.payouts` table for the request row (no new
-- table): a member request is a payout row with status 'PENDING' and
-- method 'BANK_TRANSFER'; the admin "mark paid" step flips it to 'PAID' and
-- records a WITHDRAWAL transaction + ledger movement.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Bank details on the member's users row ──────────────────────────────
-- (One bank account per member, reused across withdrawal requests.)
alter table jomlink.users
  add column if not exists bank_name         text,
  add column if not exists bank_account_no   text,
  add column if not exists bank_account_name text;

-- ── 2. WITHDRAWAL transaction type (self-heal) ─────────────────────────────
-- `create type ... enum` is never self-healing; a newly-added VALUE needs an
-- explicit ALTER. Do NOT wrap in BEGIN/COMMIT on PG < 12.
alter type jomlink.transaction_type add value if not exists 'WITHDRAWAL';

-- ── 3. Payout request tracking ─────────────────────────────────────────────
-- Reason/notes for the request, plus who settled it and when. `released_at`
-- already exists and doubles as the paid date. `approved_by` records the admin.
alter table jomlink.payouts
  add column if not exists requested_at timestamptz,
  add column if not exists approved_by  text,
  add column if not exists note         text;

-- ── 4. PostgREST schema-cache reload ───────────────────────────────────────
notify pgrst, 'reload schema';
