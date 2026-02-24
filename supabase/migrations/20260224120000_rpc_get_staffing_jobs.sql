-- RPC to list staffing_jobs. Use when PostgREST schema cache doesn't expose the table yet.
-- Call via: supabase.rpc('get_staffing_jobs')

CREATE OR REPLACE FUNCTION public.get_staffing_jobs()
RETURNS SETOF public.staffing_jobs
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.staffing_jobs ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_staffing_jobs() TO anon, authenticated, service_role;

-- Diagnostic: returns row count so we can confirm which DB the app is hitting
CREATE OR REPLACE FUNCTION public.get_staffing_jobs_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM public.staffing_jobs;
$$;

GRANT EXECUTE ON FUNCTION public.get_staffing_jobs_count() TO anon, authenticated, service_role;
