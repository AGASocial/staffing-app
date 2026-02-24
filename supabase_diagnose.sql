-- Run this in Supabase SQL Editor to diagnose your staffing_jobs issue

-- 1. Check if staffing schema exists
SELECT
  'SCHEMA CHECK' as check_type,
  schema_name,
  'EXISTS' as status
FROM information_schema.schemata
WHERE schema_name = 'staffing'
UNION ALL
SELECT
  'SCHEMA CHECK' as check_type,
  'staffing',
  'DOES NOT EXIST' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'staffing'
);

-- 2. Check public schema tables
SELECT
  'PUBLIC SCHEMA' as location,
  table_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) as exists_flag
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name LIKE 'staffing%'
ORDER BY table_name;

-- 3. Count records in public tables
SELECT
  'PUBLIC' as location,
  'staffing_jobs' as table_name,
  COUNT(*) as record_count
FROM public.staffing_jobs
UNION ALL
SELECT
  'PUBLIC' as location,
  'staffing_candidates' as table_name,
  COUNT(*) as record_count
FROM public.staffing_candidates
UNION ALL
SELECT
  'PUBLIC' as location,
  'staffing_applications' as table_name,
  COUNT(*) as record_count
FROM public.staffing_applications;

-- 4. Try to count in staffing schema (will fail if schema doesn't exist)
-- Uncomment the next block only if staffing schema exists:
/*
SELECT
  'STAFFING SCHEMA' as location,
  'jobs' as table_name,
  COUNT(*) as record_count
FROM staffing.jobs
UNION ALL
SELECT
  'STAFFING SCHEMA' as location,
  'candidates' as table_name,
  COUNT(*) as record_count
FROM staffing.candidates
UNION ALL
SELECT
  'STAFFING SCHEMA' as location,
  'applications' as table_name,
  COUNT(*) as record_count
FROM staffing.applications;
*/

-- 5. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  qual as "using_clause",
  with_check
FROM pg_policies
WHERE tablename LIKE 'staffing%'
ORDER BY schemaname, tablename, policyname;

-- 6. Check RPC functions exist
SELECT
  proname,
  prokind,
  prosecdef as "security_definer"
FROM pg_proc
WHERE proname LIKE 'get_staffing%'
ORDER BY proname;

-- 7. Test RPC function (if it exists)
-- Uncomment to test:
/*
SELECT get_staffing_jobs_count();
SELECT * FROM get_staffing_jobs() LIMIT 5;
*/

-- 8. Sample data from public.staffing_jobs (if it exists)
SELECT
  'SAMPLE DATA' as info,
  id,
  title,
  location,
  created_at
FROM public.staffing_jobs
LIMIT 5;
