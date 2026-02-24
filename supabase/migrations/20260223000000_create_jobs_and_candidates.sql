-- Job postings (roles the company is hiring for)
-- Table names use staffing_ prefix.
CREATE TABLE IF NOT EXISTS public.staffing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location text,
  pay_range text,
  shift text,
  requirements_json jsonb,
  recruiter_emails text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Candidates = applicants to a specific job (from LinkedIn, Indeed, etc.)
CREATE TABLE IF NOT EXISTS public.staffing_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.staffing_jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staffing_candidates_job_id ON public.staffing_candidates(job_id);

ALTER TABLE public.staffing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_candidates ENABLE ROW LEVEL SECURITY;

-- Demo: authenticated users can manage staffing jobs and candidates
CREATE POLICY "Authenticated users can manage staffing_jobs"
  ON public.staffing_jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage staffing_candidates"
  ON public.staffing_candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
