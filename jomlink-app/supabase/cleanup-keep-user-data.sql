-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — FRESH START CLEANUP
-- Run this in Supabase → SQL Editor.
--
-- Keeps   : user identity + profile data only
--             jomlink.users
--             jomlink.member_profiles
--             jomlink.employment_history
--             jomlink.business_profiles
--             jomlink.admin_members
--           (Supabase Auth users are NOT touched — see the note in §5.)
--
-- Deletes : every marketplace / transactional / trust / compliance row:
--             relationship_verifications, relationships, organisations,
--             proposal_negotiations, linker_proposals, appointments,
--             connection_evidence, connections, opportunities,
--             transaction_ledger, payouts, refunds, transactions,
--             disputes, reviews, reputation_metrics, notifications,
--             kyc_biometrics, kyc_records, audit_logs
--
-- SAFE : schema, enum types, tables, indexes, grants and RLS are all left
--        EXACTLY as they are. Only rows are removed. Re-runnable (idempotent).
--
-- ⚠️  WARNING: this is DESTRUCTIVE and irreversible from the SQL editor.
--     Wallet balances are DERIVED from jomlink.transactions, so deleting
--     transactions resets every wallet to RM0. Take a backup / snapshot
--     first (Supabase → Database → Backups) if you might need this data.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. PREVIEW — what is about to be deleted (run this first) ──────────────
-- This block only READS. Check the numbers, then run §3 to actually delete.
select 'opportunities'          as table_name, count(*) as rows_to_delete from jomlink.opportunities
union all select 'linker_proposals',        count(*) from jomlink.linker_proposals
union all select 'proposal_negotiations',   count(*) from jomlink.proposal_negotiations
union all select 'connections',             count(*) from jomlink.connections
union all select 'appointments',            count(*) from jomlink.appointments
union all select 'connection_evidence',     count(*) from jomlink.connection_evidence
union all select 'transactions',            count(*) from jomlink.transactions
union all select 'transaction_ledger',      count(*) from jomlink.transaction_ledger
union all select 'payouts',                 count(*) from jomlink.payouts
union all select 'refunds',                 count(*) from jomlink.refunds
union all select 'disputes',                count(*) from jomlink.disputes
union all select 'reviews',                 count(*) from jomlink.reviews
union all select 'reputation_metrics',      count(*) from jomlink.reputation_metrics
union all select 'notifications',           count(*) from jomlink.notifications
union all select 'kyc_biometrics',          count(*) from jomlink.kyc_biometrics
union all select 'kyc_records',             count(*) from jomlink.kyc_records
union all select 'audit_logs',              count(*) from jomlink.audit_logs
union all select 'relationships',           count(*) from jomlink.relationships
union all select 'relationship_verifications', count(*) from jomlink.relationship_verifications
union all select 'organisations',           count(*) from jomlink.organisations
union all select '-- KEEPING --',            null::bigint
union all select 'users (kept)',            count(*) from jomlink.users
union all select 'member_profiles (kept)',  count(*) from jomlink.member_profiles
union all select 'employment_history (kept)', count(*) from jomlink.employment_history
union all select 'business_profiles (kept)',  count(*) from jomlink.business_profiles
union all select 'admin_members (kept)',    count(*) from jomlink.admin_members
order by table_name;


-- ── 2. (optional) Turn off RLS for this session? ──────────────────────────
-- Not needed: you are running as the `postgres` role in the SQL editor,
-- which bypasses RLS. Leave this commented.
-- set session_replication_role = 'replica';


-- ── 3. DELETE — ordered so foreign keys are satisfied ─────────────────────
-- Wrapped in a single transaction: either everything is deleted, or nothing.
begin;

-- Dependent / leaf tables first (children before parents).
delete from jomlink.kyc_biometrics;                 -- → users, kyc_records
delete from jomlink.kyc_records;                    -- → users
delete from jomlink.audit_logs;                     -- → users (admin)
delete from jomlink.notifications;                  -- → users
delete from jomlink.reputation_metrics;             -- → users
delete from jomlink.reviews;                        -- → opportunities, users
delete from jomlink.disputes;                       -- → opportunities, connections
delete from jomlink.payouts;                        -- → transactions
delete from jomlink.refunds;                        -- → transactions
delete from jomlink.transaction_ledger;             -- → transactions
delete from jomlink.transactions;                   -- → opportunities, connections, users
delete from jomlink.connection_evidence;            -- → connections
delete from jomlink.appointments;                   -- → connections
delete from jomlink.connections;                    -- → opportunities, linker_proposals
delete from jomlink.proposal_negotiations;          -- → linker_proposals
delete from jomlink.linker_proposals;               -- → opportunities, users, relationships
delete from jomlink.opportunities;                  -- → users, business_profiles
delete from jomlink.relationship_verifications;     -- → relationships
delete from jomlink.relationships;                  -- → users, organisations
delete from jomlink.organisations;                  -- → relationships

commit;


-- ── 3b. ALTERNATIVE (faster) — swap §3 for this TRUNCATE block ────────────
-- TRUNCATE is much faster on large tables and resets them to empty in one go.
-- CASCADE pulls in dependent tables automatically. If you use this, you can
-- skip §3 entirely. Comment out §3 and uncomment the lines below.
--
-- begin;
-- truncate table
--   jomlink.kyc_biometrics,
--   jomlink.kyc_records,
--   jomlink.audit_logs,
--   jomlink.notifications,
--   jomlink.reputation_metrics,
--   jomlink.reviews,
--   jomlink.disputes,
--   jomlink.payouts,
--   jomlink.refunds,
--   jomlink.transaction_ledger,
--   jomlink.transactions,
--   jomlink.connection_evidence,
--   jomlink.appointments,
--   jomlink.connections,
--   jomlink.proposal_negotiations,
--   jomlink.linker_proposals,
--   jomlink.opportunities,
--   jomlink.relationship_verifications,
--   jomlink.relationships,
--   jomlink.organisations
-- restart identity cascade;
-- commit;


-- ── 4. RESET per-user derived state that lived on the KEPT profile rows ───
-- member_profiles carries cached reputation summaries. Since all reviews /
-- connections were just deleted, zero these so the profiles don't show stale
-- stats from the old data. (Users themselves are untouched.)
update jomlink.member_profiles
   set success_rate      = null,
       average_rating    = null,
       response_rate     = null,
       verified_badge    = false,
       updated_at        = now();

-- Bring the REST API's schema cache up to date (harmless, avoids stale-cache
-- PGRST errors right after a bulk delete).
notify pgrst, 'reload schema';


-- ── 5. NOTE ON SUPABASE AUTH USERS ────────────────────────────────────────
-- This script deliberately does NOT touch auth.users (Supabase Auth), so
-- everyone can still log in. The kept `jomlink.users.supabase_user_id`
-- values still point at those auth accounts.
--
-- If you ALSO want a truly clean auth slate (logins removed as well), do that
-- from the Supabase DASHBOARD, not here, because deleting from auth.users via
-- raw SQL can leave storage/identities orphaned:
--     Supabase → Authentication → Users → select all → Delete users
-- Then re-run nothing else; jomlink.users rows would keep their primary keys.


-- ── 6. VERIFY — everything deletable should be 0; kept tables unchanged ───
select 'opportunities'   as table_name, count(*) as remaining from jomlink.opportunities
union all select 'transactions',          count(*) from jomlink.transactions
union all select 'connections',           count(*) from jomlink.connections
union all select 'linker_proposals',      count(*) from jomlink.linker_proposals
union all select 'notifications',         count(*) from jomlink.notifications
union all select 'disputes',              count(*) from jomlink.disputes
union all select 'reviews',               count(*) from jomlink.reviews
union all select 'relationships',         count(*) from jomlink.relationships
union all select 'kyc_records',           count(*) from jomlink.kyc_records
union all select 'kyc_biometrics',        count(*) from jomlink.kyc_biometrics
union all select 'audit_logs',            count(*) from jomlink.audit_logs
union all select '-- KEPT --',            null::bigint
union all select 'users (kept)',          count(*) from jomlink.users
union all select 'member_profiles (kept)', count(*) from jomlink.member_profiles
union all select 'business_profiles (kept)', count(*) from jomlink.business_profiles
union all select 'admin_members (kept)',  count(*) from jomlink.admin_members
order by table_name;
