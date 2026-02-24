-- Recreate staffing tables in public schema with staffing_ prefix.
-- Drops old public.staffing_* if they exist (different shape), then creates full structure.

DROP TABLE IF EXISTS public.staffing_applications;
DROP TABLE IF EXISTS public.staffing_candidates;
DROP TABLE IF EXISTS public.staffing_jobs;

CREATE TABLE public.staffing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_name text,
  location text,
  pay_type text CHECK (pay_type IS NULL OR pay_type IN ('hourly', 'salary')),
  pay_range text,
  shift text,
  job_type text CHECK (job_type IS NULL OR job_type IN ('contract', 'temp', 'temp_to_hire', 'direct_hire')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'on_hold', 'filled', 'closed')),
  requirements_json jsonb,
  recruiter_emails text[],
  start_date date,
  duration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.staffing_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'screening', 'submitted', 'placed', 'inactive')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.staffing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.staffing_jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.staffing_candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'submitted_to_client', 'interview', 'offered', 'placed', 'rejected')),
  applied_at timestamptz DEFAULT now(),
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX idx_staffing_applications_job_id ON public.staffing_applications(job_id);
CREATE INDEX idx_staffing_applications_candidate_id ON public.staffing_applications(candidate_id);
CREATE INDEX idx_staffing_jobs_status ON public.staffing_jobs(status);
CREATE INDEX idx_staffing_candidates_status ON public.staffing_candidates(status);

ALTER TABLE public.staffing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read write staffing_jobs"
  ON public.staffing_jobs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read write staffing_candidates"
  ON public.staffing_candidates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read write staffing_applications"
  ON public.staffing_applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
