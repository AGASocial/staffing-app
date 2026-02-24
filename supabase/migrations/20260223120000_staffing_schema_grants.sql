-- Grant anon and authenticated roles access to staffing schema and all its tables.
-- Without this, Data API reports "no permissions exist for the anon or authenticated roles".

GRANT USAGE ON SCHEMA staffing TO anon;
GRANT USAGE ON SCHEMA staffing TO authenticated;

-- All current tables in staffing (jobs, candidates, applications, voice_insights, etc.)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA staffing TO anon, authenticated;
