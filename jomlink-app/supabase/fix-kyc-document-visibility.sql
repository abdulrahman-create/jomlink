-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — Fix: admin cannot view submitted KYC documents
--
-- Run this ONCE in Supabase → SQL Editor.
-- Idempotent: safe to re-run.
--
-- WHY: `submitKycAction` uploads the identity document to the private
-- `kyc-documents` bucket at object path `<userId>.<ext>`, but only persisted
-- the member-typed reference into `document_ref`. The admin review route
-- (`/api/admin/kyc/[id]/document`) then tried to sign `document_ref` as if it
-- were a bucket key, so:
--   • blank reference  → no "View document" link rendered at all, and
--   • non-blank ref    → `createSignedUrl("A1234567")` failed with a 500.
--
-- FIX: add `document_path` to hold the real bucket object path, and have the
-- write path persist it. Mirrors the self-healing style of
-- phase-14-verification-gated-release.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Storage object path for the identity document ────────────
-- Self-healing on existing databases: `alter table ... add column if not
-- exists` (never rely on `create table if not exists`, which is a NO-OP on the
-- live DB where `kyc_records` already exists).
alter table jomlink.kyc_records
  add column if not exists document_path text;

comment on column jomlink.kyc_records.document_path is
  'Object path inside the private `kyc-documents` bucket; used to mint a signed review URL. Distinct from document_ref (member-typed reference).';

-- ── 2. Backfill readable paths for pre-existing PENDING records ──
-- The upload path is deterministic: `<user_id>.<ext>`. We cannot know the
-- extension of an already-uploaded object from SQL alone, so this backfill
-- only covers single-candidate cases and is therefore left as a MANUAL step.
--
-- If you have existing submissions and know their extensions, set them with:
--
--   update jomlink.kyc_records
--      set document_path = user_id || '.pdf'
--    where document_path is null;
--
-- Otherwise, ask affected members to re-submit: the deterministic path means a
-- re-submit cleanly overwrites the prior object (upload uses `upsert: true`).
