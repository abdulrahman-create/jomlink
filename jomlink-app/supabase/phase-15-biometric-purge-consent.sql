-- ============================================================================
-- Phase 15 · Biometric purge + separate model-training consent
-- (§11.11, PDPA 2010 as amended 2024, risk register PRIV-01)
-- ============================================================================
-- Idempotent. Safe to re-run. Apply in the Supabase SQL editor, then restart
-- the PostgREST container so the schema cache reloads.
--
-- WHY
--   Blueprint v1.2 §11.11 makes two biometric obligations launch blockers:
--
--     (1) The retention/purge job is MANDATORY. `purge_requested_at` rows must
--         actually be DELETED by a scheduled job, not merely flagged. Before
--         this change a member could withdraw consent and the flag sat on the
--         row forever while the face/ID images stayed in the private bucket.
--
--     (2) Using captures to TRAIN an in-house face-match model is a SEPARATE,
--         SECONDARY purpose requiring its own specific, freely-given consent
--         and a distinct lawful basis. "A single bundled KYC consent is not
--         sufficient."
--
-- WHAT
--   1. `users` gains the independent training-consent columns, so granting KYC
--      consent can never imply training consent (and vice versa):
--        training_consent               boolean   default false
--        training_consent_at            timestamptz
--        training_consent_version       text
--        training_consent_withdrawn_at  timestamptz  (history kept on re-grant)
--
--   2. `kyc_biometrics` records WHICH PURPOSE each individual capture was
--      collected for. This is deliberately per-capture, not just per-user: a
--      member may withdraw training consent later, and only captures taken
--      while consent was active may be used as training data.
--
--   3. Indexes so the purge job (oldest-first scan) and the admin queue stay
--      cheap as the dataset grows.
--
-- NOTE: the purge itself runs in the app
--   (src/lib/biometric-purge.ts + src/lib/biometric-purge-job.ts) via
--   GET /api/admin/biometrics/purge, gated by `x-reconcile-secret`.
--   It removes the private-bucket objects AND the rows, and writes a
--   BIOMETRIC_PURGE_RUN audit entry on every run (including no-op runs).
-- ============================================================================

-- ── 1. Separate secondary-purpose consent on the member row ─────────────────
alter table jomlink.users
  add column if not exists training_consent              boolean not null default false,
  add column if not exists training_consent_at           timestamptz,
  add column if not exists training_consent_version      text,
  add column if not exists training_consent_withdrawn_at timestamptz;

comment on column jomlink.users.training_consent is
  '§11.11 secondary purpose: may Jomlink use this member''s biometric captures to train a face-match model? Independent of biometric_consent.';
comment on column jomlink.users.training_consent_withdrawn_at is
  'When training consent was last withdrawn. Retained on a later re-grant so the consent gap stays visible.';

-- ── 2. Per-capture purpose marker ──────────────────────────────────────────
alter table jomlink.kyc_biometrics
  add column if not exists training_consent_granted boolean not null default false,
  add column if not exists training_consent_version text;

comment on column jomlink.kyc_biometrics.training_consent_granted is
  'True only when training consent was active at capture time. FALSE = verification only; must never enter a training set.';

-- ── 3. Indexes for the purge scan and the consent audit ────────────────────
-- The purge job scans oldest-first and also targets requested deletions.
create index if not exists kyc_biometrics_created_idx
  on jomlink.kyc_biometrics (created_at);

create index if not exists kyc_biometrics_purge_idx
  on jomlink.kyc_biometrics (purge_requested_at)
  where purge_requested_at is not null;

-- Only training-eligible captures are ever queried as a dataset.
create index if not exists kyc_biometrics_training_idx
  on jomlink.kyc_biometrics (label_status)
  where training_consent_granted = true;

-- ── 4. Grants (new columns on existing tables inherit the table grant; keep
--       the sequence grant explicit for older installs) ─────────────────────
grant usage on schema jomlink to anon, authenticated, service_role;
grant all on all sequences in schema jomlink to service_role, authenticated;

-- Ask PostgREST to reload its schema cache so the new columns are visible to
-- the REST API immediately.
notify pgrst, 'reload schema';
