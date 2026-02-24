-- Rename jobs/candidates to staffing_jobs/staffing_candidates for existing DBs
-- that ran the old migration (without staffing_ prefix). Safe to run if tables
-- are already staffing_* (IF EXISTS guards).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    ALTER TABLE public.jobs RENAME TO staffing_jobs;
    DROP POLICY IF EXISTS "Authenticated users can manage jobs" ON public.staffing_jobs;
    CREATE POLICY "Authenticated users can manage staffing_jobs"
      ON public.staffing_jobs FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    ALTER TABLE public.candidates RENAME TO staffing_candidates;
    DROP POLICY IF EXISTS "Authenticated users can manage candidates" ON public.staffing_candidates;
    CREATE POLICY "Authenticated users can manage staffing_candidates"
      ON public.staffing_candidates FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Recreate index with new name if we renamed (old index name was idx_candidates_job_id)
DROP INDEX IF EXISTS public.idx_candidates_job_id;
CREATE INDEX IF NOT EXISTS idx_staffing_candidates_job_id ON public.staffing_candidates(job_id);
