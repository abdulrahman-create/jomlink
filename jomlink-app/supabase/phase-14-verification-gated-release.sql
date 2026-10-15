-- ═══════════════════════════════════════════════════════════════
-- JOMLINK — Phase 14 Migration
-- Verification-Gated Escrow Release (blueprint §5.7, §5.12.1)
--
-- Run this ONCE in Supabase → SQL Editor.
-- Idempotent: safe to re-run.
--
-- Closes the loophole where the Seeker was the SOLE arbiter of both
-- "completion" and "payment release". The completion workflow now has an
-- independent platform verification gate:
--
--   IN_PROGRESS -> EVIDENCE_SUBMITTED -> AWAITING_SEEKER_CONFIRMATION
--     -> AWAITING_VERIFICATION -> VERIFIED -> RELEASED (platform only)
--
-- Mirrors the style of phase-12-extension-approval.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Connection status enum: add the completion-workflow states ──
-- AWAITING_VERIFICATION already exists (added with the base schema); add the
-- three missing ones. `create type ... enum` is NEVER self-healing, so any new
-- VALUE requires an explicit `alter type ... add value if not exists`.
--
-- NOTE: on PostgreSQL < 12 `ALTER TYPE ... ADD VALUE` cannot run inside a
-- transaction block. Run this section on its own (or ensure the migration is
-- not wrapped in BEGIN/COMMIT) — the same caveat documented in
-- jomlink-schema.sql § 1b.
alter type jomlink.connection_status add value if not exists 'EVIDENCE_SUBMITTED';
alter type jomlink.connection_status add value if not exists 'AWAITING_SEEKER_CONFIRMATION';
alter type jomlink.connection_status add value if not exists 'VERIFIED';

-- ── 2. Completion-workflow columns on connections ────────────────
-- Self-healing on existing databases: `alter table ... add column if not
-- exists` (never rely on `create table if not exists`, which is a NO-OP on the
-- live DB where `connections` already exists).
alter table jomlink.connections
  add column if not exists evidence_submitted_at      timestamptz,
  add column if not exists seeker_confirmed_at        timestamptz,
  add column if not exists seeker_confirmation_status text,  -- CONFIRMED | REJECTED | TIMED_OUT
  add column if not exists verification_status        text,  -- PENDING | PASSED | FAILED | MANUAL_REVIEW
  add column if not exists verified_at                timestamptz,
  add column if not exists verification_notes         text,
  add column if not exists risk_score                 integer,
  add column if not exists risk_level                 text,  -- LOW | MEDIUM | HIGH
  add column if not exists release_hold_until         timestamptz;

-- ── 3. Grants (mirror the base schema) ───────────────────────────
grant usage on schema jomlink to anon, authenticated, service_role;
grant all on jomlink.connections to service_role;

-- ── 4. Reload PostgREST schema cache (new columns must be visible) ──
notify pgrst, 'reload schema';
