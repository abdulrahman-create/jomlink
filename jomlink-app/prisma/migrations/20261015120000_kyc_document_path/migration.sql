-- Migration: add kyc_records.document_path
--
-- The KYC submission flow uploads the identity document to the private
-- `kyc-documents` bucket at a deterministic object path (`<userId>.<ext>`), but
-- the path was never persisted - only the member-typed `document_ref` was.
-- The admin review route signed `document_ref` as a bucket key, so admins could
-- not view submitted documents (no link when blank, HTTP 500 when not).
--
-- Self-healing: `add column if not exists` keeps this safe on databases where
-- the column was already applied manually via `supabase fix-kyc-document-visibility.sql`.

ALTER TABLE "kyc_records" ADD COLUMN IF NOT EXISTS "document_path" TEXT;
