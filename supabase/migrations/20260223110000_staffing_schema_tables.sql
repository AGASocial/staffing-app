-- Total Talent Resources – all staffing data in schema "staffing"
-- Tables: staffing.jobs, staffing.candidates, staffing.applications

CREATE SCHEMA IF NOT EXISTS staffing;

-- Job postings (roles the agency is staffing for)
CREATE TABLE IF NOT EXISTS staffing.jobs (
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

-- Candidate pool (one record per person; can apply to many jobs)
CREATE TABLE IF NOT EXISTS staffing.candidates (
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

-- Applications: candidate applied to job (many-to-many with status)
CREATE TABLE IF NOT EXISTS staffing.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES staffing.jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES staffing.candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'submitted_to_client', 'interview', 'offered', 'placed', 'rejected')),
  applied_at timestamptz DEFAULT now(),
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_staffing_applications_job_id ON staffing.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_staffing_applications_candidate_id ON staffing.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_staffing_jobs_status ON staffing.jobs(status);
CREATE INDEX IF NOT EXISTS idx_staffing_candidates_status ON staffing.candidates(status);

-- RLS: single-tenant demo – authenticated users can manage all staffing data
ALTER TABLE staffing.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage staffing_jobs"
  ON staffing.jobs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage staffing_candidates"
  ON staffing.candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage staffing_applications"
  ON staffing.applications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
