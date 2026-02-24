-- Drop the old staffing schema and all tables in it.
-- App uses public.staffing_jobs, staffing_candidates, staffing_applications, staffing_voice_insights (unchanged).

DROP SCHEMA IF EXISTS staffing CASCADE;
