-- ============================================================
-- Capabilio: Profile + Vault Fix Migration
-- Run this in Supabase SQL Editor if Career & Vault shows
-- empty data or Vault shows 0 documents.
-- ============================================================

-- 1. Add any missing columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experiences        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vault_files        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resume_projects    jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications     jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_resume_upload text,
  ADD COLUMN IF NOT EXISTS resume_uploaded_at text,
  ADD COLUMN IF NOT EXISTS skills             jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_summary    text;

-- 2. Create vault_documents table for VaultManager Pro
CREATE TABLE IF NOT EXISTS vault_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL DEFAULT 'other',
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  tags          TEXT[]  DEFAULT '{}',
  is_private    BOOLEAN DEFAULT FALSE,
  activity_log  JSONB   DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS vault_documents_user_id_idx ON vault_documents(user_id);

-- RLS: only owner can see their docs
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own vault docs" ON vault_documents;
CREATE POLICY "Users can manage their own vault docs" ON vault_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Create Supabase Storage bucket for vault files (run this separately if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('vault-documents', 'vault-documents', false)
-- ON CONFLICT DO NOTHING;

-- 4. Storage policies for vault-documents bucket
-- (Only needed if bucket doesn't already exist)
-- INSERT INTO storage.policies (name, definition, bucket_id)
-- VALUES (
--   'Authenticated users can manage their vault files',
--   '(auth.uid() = (storage.foldername(name))[1]::uuid)',
--   'vault-documents'
-- ) ON CONFLICT DO NOTHING;

SELECT 'Migration complete ✓' AS status;
