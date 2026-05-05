-- ============================================================
-- Candidates Module: extend staffing_candidates + resume storage
-- ============================================================

-- 1. Add new columns to staffing_candidates
ALTER TABLE public.staffing_candidates
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'applied'
    CHECK (pipeline_status IN ('applied','screened','interviewed','placed','inactive')),
  ADD COLUMN IF NOT EXISTS resume_url       TEXT        NULL,
  ADD COLUMN IF NOT EXISTS resume_file_name TEXT        NULL,
  ADD COLUMN IF NOT EXISTS skills           TEXT        NULL,
  ADD COLUMN IF NOT EXISTS location         TEXT        NULL,
  ADD COLUMN IF NOT EXISTS availability     TEXT        NULL,
  ADD COLUMN IF NOT EXISTS voice_screening_summary     TEXT NULL,
  ADD COLUMN IF NOT EXISTS voice_screening_disposition TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_call_id     TEXT        NULL;

-- 2. Index on pipeline_status for quick filtering
CREATE INDEX IF NOT EXISTS idx_staffing_candidates_pipeline_status
  ON public.staffing_candidates (pipeline_status);

-- 3. Create resumes storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS: allow authenticated users to upload/read their own candidates' resumes
-- Recruiters manage all resumes (no per-user scoping needed for staffing tool)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY IF NOT EXISTS "Authenticated users can read resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resumes');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'resumes');

-- 5. RLS on staffing_candidates (ensure authenticated users can CRUD)
ALTER TABLE public.staffing_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'staffing_candidates' AND policyname = 'Authenticated full access to candidates'
  ) THEN
    CREATE POLICY "Authenticated full access to candidates"
      ON public.staffing_candidates
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
