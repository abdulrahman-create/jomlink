-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — Phase 12 Migration
-- Extension Request / Approval (blueprint §5.14)
--
-- Run this ONCE in Supabase → SQL Editor, AFTER phase-09-deadline-progress.sql.
-- Idempotent: safe to re-run.
--
-- WHY THIS EXISTS
-- ---------------
-- §5.14: "A Linker may request an extension before the Opportunity expires…
-- If accepted, the new deadline becomes the official Opportunity deadline and
-- the yellow flag is cleared for the original deadline. If rejected, the
-- original deadline remains applicable and the yellow flag remains raised."
--
-- The previous implementation applied the extension immediately on the Linker's
-- own request and cleared their own yellow flag — so the party the mechanism is
-- meant to hold accountable was the party deciding whether to hold them
-- accountable. This table records the request so the SEEKER decides.
--
-- The extension is deliberately a separate record rather than columns on
-- `connections`: §5.14 requires the reason, the timestamps and both parties'
-- positions to form part of the permanent evidence of record (§9.11), and a
-- connection may see more than one request over its life.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Status enum ─────────────────────────────────────────────
do $$ begin
  create type jomlink.extension_status as enum ('REQUESTED','ACCEPTED','REJECTED','WITHDRAWN');
exception when duplicate_object then null; end $$;

-- ── 2. Extension request record (§5.14) ────────────────────────
create table if not exists jomlink.connection_extensions (
  id                text primary key default gen_random_uuid()::text,
  connection_id     text not null references jomlink.connections(id) on delete cascade,
  requested_by_id   text not null references jomlink.users(id) on delete cascade,
  -- The deadline in force when the request was made, so the record shows what
  -- was being extended rather than only the outcome.
  previous_deadline timestamptz,
  requested_deadline timestamptz not null,
  days_requested    integer not null,
  reason            text,
  status            jomlink.extension_status not null default 'REQUESTED',
  -- Who decided, and when. Null while REQUESTED.
  responded_by_id   text references jomlink.users(id) on delete set null,
  responded_at      timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One open request per connection at a time. A partial unique index lets a
-- connection accumulate a history of decided requests while preventing two
-- competing live ones (which would make "the pending extension" ambiguous).
create unique index if not exists connection_extensions_one_open_idx
  on jomlink.connection_extensions(connection_id)
  where status = 'REQUESTED';

create index if not exists connection_extensions_connection_idx
  on jomlink.connection_extensions(connection_id, created_at desc);

create index if not exists connection_extensions_status_idx
  on jomlink.connection_extensions(status);

-- ── 3. Keep updated_at honest ──────────────────────────────────
-- Matches the trigger style used elsewhere in the schema; guarded so re-running
-- this file does not fail on an existing trigger.
do $$ begin
  create trigger connection_extensions_set_updated_at
    before update on jomlink.connection_extensions
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;

-- ── 4. Grants (service role reads/writes; mirror the base schema) ──
-- PostgREST runs every request from this app as `service_role`, so without these
-- the table exists but every query fails with 42501 "permission denied for table
-- connection_extensions" — the same user-visible breakage PGRST205 produces when
-- the table is missing entirely. phase-09-deadline-progress.sql grants these for
-- the tables it creates; this file must match.
grant usage on schema jomlink to anon, authenticated, service_role;
grant all on jomlink.connection_extensions to service_role;
