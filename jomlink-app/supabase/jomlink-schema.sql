-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — Supabase Schema Migration
-- Run this ONCE in Supabase → SQL Editor.
--
-- IMPORTANT
--   • Creates an isolated `jomlink` schema (NOT `public`) so your
--     other apps' tables in `public` are never touched/overwritten.
--   • Supabase service-role key can read/write any schema, so the
--     app hits `jomlink.*` tables via the REST API at runtime.
--   • Grants the `authenticated` and `service_role` roles usage on
--     the schema and its tables.
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Create the isolated schema ──────────────────────────────
create schema if not exists jomlink;
grant usage on schema jomlink to anon, authenticated, service_role;

-- ── 1. Enum types (Postgres) ───────────────────────────────────
do $$ begin
  -- role
  create type jomlink.role as enum ('SEEKER','LINKER','BOTH','ADMIN');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.admin_role as enum ('SUPER_ADMIN','OPERATIONS','KYC','FINANCE','DISPUTE','COMPLIANCE','SUPPORT');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.verification_status as enum ('UNVERIFIED','PENDING','VERIFIED','REJECTED','EXPIRED','SUSPENDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.relationship_category as enum ('CURRENT_EMPLOYEE','FORMER_EMPLOYEE','BUSINESS_PARTNER','CLIENT','FORMER_CLIENT','SUPPLIER','CUSTOMER','CONSULTANT','ADVISOR','INVESTOR','PROFESSIONAL_CONTACT','INDUSTRY_CONTACT','ASSOCIATION_MEMBERSHIP','GOVERNMENT_PUBLIC_SECTOR','OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.relationship_visibility as enum ('PUBLIC','PLATFORM_ONLY','OPPORTUNITY_SPECIFIC');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.opportunity_category as enum ('BUSINESS_INTRODUCTION','EXECUTIVE_MEETING','INVESTOR_CONNECTION','CUSTOMER_CLIENT_CONNECTION','SUPPLIER_CONNECTION','DISTRIBUTOR_AGENT_CONNECTION','STRATEGIC_PARTNER','GOVERNMENT_PUBLIC_SECTOR','PROFESSIONAL_EXPERT','SITE_VISIT_ACCESS','OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.opportunity_status as enum ('DRAFT','PENDING_PAYMENT','ACTIVE','PROPOSAL_RECEIVED','NEGOTIATION','LINKER_SELECTED','AWAITING_CONFIRMATION','IN_PROGRESS','APPOINTMENT_SCHEDULED','AWAITING_VERIFICATION','COMPLETED','DISPUTED','FAILED','EXPIRED','CANCELLED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.confidentiality_level as enum ('PUBLIC','MATCHED','RESTRICTED','PRIVATE_DIRECT');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.proposal_status as enum ('SUBMITTED','UNDER_REVIEW','ACCEPTED','REJECTED','WITHDRAWN','SELECTED','COMPLETED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.connection_degree as enum ('FIRST','SECOND','THIRD');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.appointment_status as enum ('PROPOSED','ACKNOWLEDGED','REJECTED','SCHEDULED','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.connection_status as enum ('PENDING_ACKNOWLEDGEMENT','IN_PROGRESS','AWAITING_VERIFICATION','COMPLETED','FAILED','DISPUTED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.transaction_status as enum ('PENDING','COMPLETED','FAILED','REVERSED','REFUNDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.transaction_type as enum ('OPPORTUNITY_FUNDING','ACTIVATION_FEE','LINKER_SERVICE_FEE','REWARD_RELEASE','REFUND','PAYOUT','WALLET_CREDIT','WALLET_DEBIT');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.dispute_status as enum ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.dispute_outcome as enum ('COMPLETED','PARTIALLY_COMPLETED','FAILED','REFUNDED','OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.notification_channel as enum ('IN_APP','EMAIL','SMS','PUSH');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.currency as enum ('MYR','THB','VND','IDR','INR','USD');
exception when duplicate_object then null; end $$;
do $$ begin
  create type jomlink.evidence_type as enum ('INTRODUCTION','COMMUNICATION','MEETING_PHOTO','MEETING_SCREENSHOT','APPOINTMENT_CONFIRMATION','TARGET_ACKNOWLEDGEMENT','OTHER');
exception when duplicate_object then null; end $$;

-- ── 2. Tables ──────────────────────────────────────────────────
-- Each table is prefixed `jomlink.` so it never collides with `public`.
-- Auth conflict-avoidance: `users` is named `users` (NOT auth.users).

create table if not exists jomlink.users (
  id                 text primary key default gen_random_uuid()::text,
  email              text unique not null,
  email_verified     boolean not null default false,
  mobile             text not null default '',
  mobile_verified    boolean not null default false,
  password_hash      text not null default '',
  full_name          text not null,
  country            text not null default 'MY',
  location           text,
  profile_photo_url  text,
  role               jomlink.role not null default 'SEEKER',
  status             text not null default 'ACTIVE',
  supabase_user_id   text unique,
  app                text not null default 'jomlink',  -- auth isolation tag
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists jomlink.member_profiles (
  id                      text primary key default gen_random_uuid()::text,
  user_id                 text unique not null references jomlink.users(id) on delete cascade,
  headline                text,
  current_position        text,
  current_organisation    text,
  industry                text,
  city                    text,
  region                  text,
  country                 text,
  languages               text[] not null default '{}',
  years_of_experience     int,
  bio                     text,
  verified_badge          boolean not null default false,
  verification_status     jomlink.verification_status not null default 'UNVERIFIED',
  success_rate            numeric(5,2),
  average_rating          numeric(3,2),
  response_rate           numeric(5,2),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists jomlink.employment_history (
  id            text primary key default gen_random_uuid()::text,
  profile_id    text not null references jomlink.member_profiles(id) on delete cascade,
  organisation  text not null,
  position      text not null,
  start_date    timestamptz,
  end_date      timestamptz,
  current       boolean not null default false,
  description   text,
  created_at    timestamptz not null default now()
);

create table if not exists jomlink.business_profiles (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references jomlink.users(id) on delete cascade,
  name         text not null,
  industry     text,
  description  text,
  objectives   text[] not null default '{}',
  website      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists jomlink.organisations (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  type         text,
  country      text,
  website      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (name)
);

create table if not exists jomlink.relationships (
  id                    text primary key default gen_random_uuid()::text,
  user_id               text not null references jomlink.users(id) on delete cascade,
  organisation_id       text references jomlink.organisations(id),
  entity_name           text not null,
  category              jomlink.relationship_category not null,
  visibility            jomlink.relationship_visibility not null default 'PUBLIC',
  connection_degree     jomlink.connection_degree not null default 'FIRST',
  relevance_note        text,
  period_label          text,
  verified              boolean not null default false,
  verification_status   jomlink.verification_status not null default 'UNVERIFIED',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists jomlink.opportunities (
  id                          text primary key default gen_random_uuid()::text,
  seeker_id                   text not null references jomlink.users(id) on delete cascade,
  business_profile_id         text references jomlink.business_profiles(id),
  title                       text not null,
  category                    jomlink.opportunity_category not null,
  target_entity               text not null,
  target_role                 text,
  target_role_exact           boolean not null default true,
  purpose                     text not null,
  business_description        text,
  required_outcome            text not null,
  connection_method           text,
  acceptable_alternatives     text,
  geographic_preference       text,
  deadline                    timestamptz,
  offer_amount                numeric(12,2) not null,
  currency                    jomlink.currency not null default 'MYR',
  confidentiality             jomlink.confidentiality_level not null default 'PUBLIC',
  additional_requirements     text,
  status                      jomlink.opportunity_status not null default 'DRAFT',
  activation_fee              numeric(12,2),
  funded_amount               numeric(12,2),
  is_restricted_category      boolean not null default false,
  match_score                 int,
  expires_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table if not exists jomlink.linker_proposals (
  id                     text primary key default gen_random_uuid()::text,
  opportunity_id         text not null references jomlink.opportunities(id) on delete cascade,
  linker_id              text not null references jomlink.users(id) on delete cascade,
  relationship_id        text references jomlink.relationships(id),
  relationship_declared  text,
  proposed_target        text,
  proposed_method        text,
  proposed_deliverable   text,
  proposed_reward        numeric(12,2) not null,
  proposed_deadline      timestamptz,
  remarks                text,
  status                 jomlink.proposal_status not null default 'SUBMITTED',
  is_target_substitution boolean not null default false,
  substitution_reason    text,
  agreed_reward          numeric(12,2),
  agreed_deliverable     text,
  agreed_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists jomlink.proposal_negotiations (
  id               text primary key default gen_random_uuid()::text,
  proposal_id      text not null references jomlink.linker_proposals(id) on delete cascade,
  from_role        text,
  offered_reward   numeric(12,2) not null,
  message          text,
  status           text not null default 'COUNTER',
  created_at       timestamptz not null default now()
);

create table if not exists jomlink.connections (
  id               text primary key default gen_random_uuid()::text,
  opportunity_id   text not null references jomlink.opportunities(id) on delete cascade,
  proposal_id      text not null references jomlink.linker_proposals(id) on delete cascade,
  linker_id        text not null,
  status           jomlink.connection_status not null default 'PENDING_ACKNOWLEDGEMENT',
  agreed_reward    numeric(12,2),
  target_scheduled text,
  completion_notes text,
  completed_at     timestamptz,
  auto_release_at  timestamptz,
  release_status   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists jomlink.appointments (
  id             text primary key default gen_random_uuid()::text,
  connection_id  text not null references jomlink.connections(id) on delete cascade,
  date           timestamptz not null,
  location       text,
  method         text,
  target         text,
  remarks        text,
  status         jomlink.appointment_status not null default 'PROPOSED',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists jomlink.connection_evidence (
  id               text primary key default gen_random_uuid()::text,
  connection_id    text not null references jomlink.connections(id) on delete cascade,
  type             jomlink.evidence_type not null,
  description      text,
  file_url         text,
  file_access_key  text,
  approved         boolean,
  reviewed_by      text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists jomlink.transactions (
  id                text primary key default gen_random_uuid()::text,
  user_id           text not null,
  opportunity_id    text,
  connection_id     text,
  type              jomlink.transaction_type not null,
  status            jomlink.transaction_status not null default 'PENDING',
  amount            numeric(12,2) not null,
  fee_raw           numeric(12,2),
  currency          jomlink.currency not null default 'MYR',
  exchange_rate     numeric(12,6),
  settlement_amount numeric(12,2),
  description       text,
  reference         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists jomlink.transaction_ledger (
  id              text primary key default gen_random_uuid()::text,
  transaction_id  text not null references jomlink.transactions(id) on delete cascade,
  account         text not null,
  debit           numeric(12,2) not null default 0,
  credit          numeric(12,2) not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists jomlink.payouts (
  id              text primary key default gen_random_uuid()::text,
  transaction_id  text not null references jomlink.transactions(id) on delete cascade,
  recipient_id    text not null,
  amount          numeric(12,2) not null,
  service_fee     numeric(12,2) not null default 0,
  net_amount      numeric(12,2) not null,
  method          text,
  status          text not null default 'PENDING',
  released_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table if not exists jomlink.refunds (
  id              text primary key default gen_random_uuid()::text,
  transaction_id  text not null references jomlink.transactions(id) on delete cascade,
  recipient_id    text not null,
  amount          numeric(12,2) not null,
  reason          text,
  status          text not null default 'PENDING',
  approved_by     text,
  created_at      timestamptz not null default now()
);

create table if not exists jomlink.disputes (
  id              text primary key default gen_random_uuid()::text,
  opportunity_id  text not null references jomlink.opportunities(id) on delete cascade,
  connection_id   text references jomlink.connections(id),
  raised_by_id    text not null,
  reason          text not null,
  description     text,
  evidence        text,
  status          jomlink.dispute_status not null default 'OPEN',
  outcome         jomlink.dispute_outcome,
  resolution_note text,
  resolved_by     text,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists jomlink.reviews (
  id              text primary key default gen_random_uuid()::text,
  opportunity_id  text not null references jomlink.opportunities(id) on delete cascade,
  author_id       text not null,
  subject_id      text not null,
  rating          int not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

create table if not exists jomlink.reputation_metrics (
  id                 text primary key default gen_random_uuid()::text,
  user_id            text unique not null references jomlink.users(id) on delete cascade,
  completed_count    int not null default 0,
  successful_count   int not null default 0,
  success_rate       numeric(5,2) not null default 0,
  average_rating     numeric(3,2) not null default 0,
  response_rate      numeric(5,2) not null default 0,
  cancellation_count int not null default 0,
  dispute_count      int not null default 0,
  on_time_count      int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists jomlink.notifications (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null,
  type        text not null,
  title       text not null,
  body        text,
  channel     jomlink.notification_channel not null default 'IN_APP',
  read        boolean not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists jomlink.kyc_records (
  id              text primary key default gen_random_uuid()::text,
  user_id         text not null references jomlink.users(id) on delete cascade,
  status          jomlink.verification_status not null default 'PENDING',
  document_type   text,
  document_ref    text,
  reviewed_by     text,
  reviewed_at     timestamptz,
  expiry_date     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists jomlink.admin_members (
  id           text primary key default gen_random_uuid()::text,
  user_id      text unique not null references jomlink.users(id) on delete cascade,
  role         jomlink.admin_role not null default 'OPERATIONS',
  permissions  text[] not null default '{}',
  mfa_enabled  boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists jomlink.audit_logs (
  id          text primary key default gen_random_uuid()::text,
  admin_id    text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  details     jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

-- ── 3. RLS (Row Level Security) ───────────────────────────────
-- The app uses the SERVICE_ROLE key (bypasses RLS) for Jomlink data.
-- RLS disabled on jomlink tables by default; enable per-table if you
-- later switch to anon-key client-side access. This keeps migrations
-- simple and safe while service-role is the only writer.

alter table jomlink.users                 enable row level security;
alter table jomlink.member_profiles       enable row level security;
alter table jomlink.employment_history    enable row level security;
alter table jomlink.business_profiles     enable row level security;
alter table jomlink.organisations         enable row level security;
alter table jomlink.relationships         enable row level security;
alter table jomlink.opportunities         enable row level security;
alter table jomlink.linker_proposals      enable row level security;
alter table jomlink.proposal_negotiations enable row level security;
alter table jomlink.connections           enable row level security;
alter table jomlink.appointments          enable row level security;
alter table jomlink.connection_evidence   enable row level security;
alter table jomlink.transactions          enable row level security;
alter table jomlink.transaction_ledger    enable row level security;
alter table jomlink.payouts               enable row level security;
alter table jomlink.refunds               enable row level security;
alter table jomlink.disputes              enable row level security;
alter table jomlink.reviews               enable row level security;
alter table jomlink.reputation_metrics    enable row level security;
alter table jomlink.notifications         enable row level security;
alter table jomlink.kyc_records           enable row level security;
alter table jomlink.admin_members         enable row level security;
alter table jomlink.audit_logs            enable row level security;

-- ── 4. Updated-at trigger (simple) ────────────────────────────
create or replace function jomlink.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger set_updated_at before update on jomlink.users
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.member_profiles
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.business_profiles
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.organisations
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.relationships
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.opportunities
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.linker_proposals
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.connections
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.appointments
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.transactions
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.disputes
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.reputation_metrics
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger set_updated_at before update on jomlink.kyc_records
    for each row execute function jomlink.set_updated_at();
exception when duplicate_object then null; end $$;

-- ── 5. Default grants for service_role ────────────────────────
grant all on all tables in schema jomlink to service_role, authenticated;
grant all on all sequences in schema jomlink to service_role, authenticated;

-- Done. ✅
-- Next: the Jomlink app (supabase-js, service-role) reads/writes
--       `jomlink.*` and tags its auth users with app='jomlink'.