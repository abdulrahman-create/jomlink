-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — Phase 9 Migration
-- Deadline Setting + Progress Report Thread + Yellow Flag
-- (blueprint §5.6.1, §5.6.2, §9.11.1)
--
-- Run this ONCE in Supabase → SQL Editor, AFTER jomlink-schema.sql.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. New enum values on the existing opportunity_status ──────
-- Postgres has no "add value if not exists", so guard each one.
do $$ begin
  alter type jomlink.opportunity_status add value if not exists 'DEADLINE_REQUESTED';
exception when duplicate_object then null; end $$;
do $$ begin
  alter type jomlink.opportunity_status add value if not exists 'FLAGGED';
exception when duplicate_object then null; end $$;

-- ── 2. New enum types ──────────────────────────────────────────
do $$ begin
  create type jomlink.deadline_status as enum ('REQUESTED','ACCEPTED','REJECTED','SUPERSEDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.flag_type as enum ('MISSED_COMMITMENT');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.flag_status as enum ('RAISED','CLEARED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.progress_report_status as enum ('ON_TRACK','AT_RISK','BLOCKED','COMPLETE');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.progress_author_role as enum ('LINKER','SEEKER','ADMIN');
exception when duplicate_object then null; end $$;

-- ── 3. Deadline request record (§5.6.1) ────────────────────────
-- One official deadline record per connection. The Linker proposes; the
-- Seeker accepts or rejects. A rejected proposal reopens negotiation.
create table if not exists jomlink.opportunity_deadlines (
  id                text primary key default gen_random_uuid()::text,
  connection_id     text not null unique references jomlink.connections(id) on delete cascade,
  proposed_by_id    text not null references jomlink.users(id) on delete cascade,
  proposed_date     timestamptz not null,
  deliverable       text,
  note              text,
  status            jomlink.deadline_status not null default 'REQUESTED',
  accepted_date     timestamptz,
  responded_at      timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists opportunity_deadlines_status_idx
  on jomlink.opportunity_deadlines(status);

-- ── 4. Progress report thread (§5.6.2) ─────────────────────────
-- Linker posts reports against an accepted deadline; both parties comment.
-- Nothing here is ever hard-deleted.
create table if not exists jomlink.progress_reports (
  id                text primary key default gen_random_uuid()::text,
  connection_id     text not null references jomlink.connections(id) on delete cascade,
  author_id         text not null references jomlink.users(id) on delete cascade,
  body              text not null,
  status            jomlink.progress_report_status not null default 'ON_TRACK',
  milestone         integer,
  revised_deadline  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists progress_reports_connection_idx
  on jomlink.progress_reports(connection_id, created_at);

create table if not exists jomlink.progress_report_comments (
  id              text primary key default gen_random_uuid()::text,
  report_id       text not null references jomlink.progress_reports(id) on delete cascade,
  author_id       text not null references jomlink.users(id) on delete cascade,
  author_role     jomlink.progress_author_role not null,
  body            text not null,
  edited          boolean not null default false,
  revision_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists progress_report_comments_report_idx
  on jomlink.progress_report_comments(report_id, created_at);

-- Immutable update history: every prior version of an edited comment.
-- This is what makes the thread evidence-bearing in a dispute (§9.11.1).
create table if not exists jomlink.progress_report_comment_revisions (
  id               text primary key default gen_random_uuid()::text,
  comment_id       text not null references jomlink.progress_report_comments(id) on delete cascade,
  body             text not null,
  revision_number  integer not null,
  edited_by_id     text not null references jomlink.users(id) on delete cascade,
  edited_at        timestamptz not null default now()
);

create index if not exists progress_report_comment_revisions_comment_idx
  on jomlink.progress_report_comment_revisions(comment_id, revision_number);

-- ── 5. Linker commitment flags (§5.6.1) ────────────────────────
-- Yellow flag raised when a Linker misses a deadline they proposed.
-- Cleared on on-time delivery or an accepted extension.
create table if not exists jomlink.linker_flags (
  id              text primary key default gen_random_uuid()::text,
  linker_id       text not null references jomlink.users(id) on delete cascade,
  connection_id   text not null references jomlink.connections(id) on delete cascade,
  deadline_id     text,
  type            jomlink.flag_type not null default 'MISSED_COMMITMENT',
  reason          text,
  status          jomlink.flag_status not null default 'RAISED',
  raised_at       timestamptz not null default now(),
  cleared_at      timestamptz,
  cleared_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (linker_id, connection_id, deadline_id)
);

create index if not exists linker_flags_linker_idx
  on jomlink.linker_flags(linker_id, status);

-- ── 6. Commitment metrics on reputation (§5.15) ───────────────
alter table jomlink.reputation_metrics
  add column if not exists deadlines_requested integer not null default 0,
  add column if not exists deadlines_met       integer not null default 0,
  add column if not exists deadlines_missed    integer not null default 0,
  add column if not exists flags_raised        integer not null default 0,
  add column if not exists flags_cleared       integer not null default 0;

-- ── 7. Grants (service role reads/writes; mirror the base schema) ──
grant usage on schema jomlink to anon, authenticated, service_role;
grant all on jomlink.opportunity_deadlines to service_role;
grant all on jomlink.progress_reports to service_role;
grant all on jomlink.progress_report_comments to service_role;
grant all on jomlink.progress_report_comment_revisions to service_role;
grant all on jomlink.linker_flags to service_role;
