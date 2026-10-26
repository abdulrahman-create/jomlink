-- ============================================================================
-- Phase 15 · Post-release clawback (§5.12.1, §11.7)
-- ============================================================================
-- Idempotent. Safe to re-run. Apply in the Supabase SQL editor, then restart
-- the PostgREST container so the schema cache reloads.
--
-- WHY
--   Today, once a reward is released the Seeker has no way to recover it, even
--   if they discover days later that the "meeting" never happened. Blueprint
--   §5.12.1 requires a post-release clawback inside DISPUTE_WINDOW (7 days),
--   and §11.7 requires it to be a recorded RECOVERY WORKFLOW rather than a
--   silent ledger reversal:
--     • never silently push a wallet negative,
--     • record the original payout, reason, provider response, amount
--       recovered and the amount still outstanding,
--     • never claim a clawback is "completed" until it is actually recovered,
--     • unresolved shortfalls route to manual review.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum values
-- ---------------------------------------------------------------------------
-- `create type ... enum` is NEVER self-healing (see fix-transaction-type-enum),
-- so new values need explicit ALTER TYPE ... ADD VALUE IF NOT EXISTS.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on PG < 12.

alter type jomlink.dispute_outcome add value if not exists 'CLAWBACK';

alter type jomlink.transaction_type add value if not exists 'CLAWBACK';

-- ---------------------------------------------------------------------------
-- 2. Clawbacks table
-- ---------------------------------------------------------------------------
create table if not exists jomlink.clawbacks (
  id                  text primary key default gen_random_uuid()::text,
  connection_id       text not null references jomlink.connections(id) on delete cascade,
  opportunity_id      text not null references jomlink.opportunities(id) on delete cascade,
  dispute_id          text references jomlink.disputes(id) on delete set null,
  linker_id           text not null references jomlink.users(id) on delete cascade,

  -- What the platform decided, why, and who decided it.
  amount              numeric(14,2) not null check (amount > 0),
  reason              text not null,
  decided_by          text not null references jomlink.users(id) on delete restrict,
  decided_at          timestamptz not null default now(),

  -- What actually happened. `amount_recovered` + `amount_outstanding` = amount.
  amount_recovered    numeric(14,2) not null default 0,
  amount_outstanding  numeric(14,2) not null default 0,
  status              text not null default 'PENDING'
                        check (status in ('PENDING','PARTIAL','RECOVERED','CANCELLED')),

  -- §11.7: recovery is a provider-acknowledged process, not a status flip.
  recovery_method     text,          -- WALLET_DEBIT | MANUAL_TRANSFER | NONE
  provider_ref        text,          -- provider/gateway reference when relevant
  provider_response   text,          -- what the provider said, verbatim
  requires_manual_review boolean not null default false,
  review_note         text,

  -- The payout this clawback targets + the wallet debit it produced (both
  -- optional: a clawback may be decided before any money is recoverable).
  original_payout_id  text references jomlink.payouts(id) on delete set null,
  recovery_transaction_id text references jomlink.transactions(id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Grants + indexes + schema-cache reload
-- ---------------------------------------------------------------------------
-- New tables in `jomlink` need explicit GRANTs: the blanket
-- `grant all on all tables` only covers tables that existed when it last ran.
grant usage on schema jomlink to anon, authenticated, service_role;
grant all on jomlink.clawbacks to anon, authenticated, service_role;

create index if not exists clawbacks_connection_idx
  on jomlink.clawbacks (connection_id);
create index if not exists clawbacks_linker_idx
  on jomlink.clawbacks (linker_id);
create index if not exists clawbacks_status_idx
  on jomlink.clawbacks (status)
  where status in ('PENDING','PARTIAL');

-- ---------------------------------------------------------------------------
-- 4. Verification (run manually)
-- ---------------------------------------------------------------------------
-- select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
--   where t.typname = 'dispute_outcome' order by enumsortorder;   -- expect CLAWBACK
-- select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
--   where t.typname = 'transaction_type' order by enumsortorder;  -- expect CLAWBACK
-- select count(*) from jomlink.clawbacks;

notify pgrst, 'reload schema';
