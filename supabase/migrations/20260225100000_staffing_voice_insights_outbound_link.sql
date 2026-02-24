-- Link outbound call outcomes to job + candidate; store Retell call_id for idempotency.
ALTER TABLE public.staffing_voice_insights
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.staffing_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.staffing_candidates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS call_id text;

CREATE INDEX IF NOT EXISTS idx_staffing_voice_insights_job_candidate_direction
  ON public.staffing_voice_insights (job_id, candidate_id, direction)
  WHERE job_id IS NOT NULL AND candidate_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staffing_voice_insights_call_id
  ON public.staffing_voice_insights (call_id)
  WHERE call_id IS NOT NULL;

GRANT UPDATE ON public.staffing_voice_insights TO anon, authenticated;
CREATE POLICY "Allow update staffing_voice_insights"
  ON public.staffing_voice_insights FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
