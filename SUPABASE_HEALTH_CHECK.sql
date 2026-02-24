-- Supabase Health Check - Run in SQL Editor

-- 1. Check all tables and their row counts
SELECT schemaname, tablename, n_live_tup as rowcount
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check if RLS is enabled on tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Check all RLS policies
SELECT tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Test direct reads on key tables
SELECT COUNT(*) as staffing_jobs_count FROM public.staffing_jobs;
SELECT COUNT(*) as users_count FROM public.users;
SELECT COUNT(*) as digital_assets_count FROM public.digital_assets;

-- 5. Test the RPC function
SELECT COUNT(*) FROM get_staffing_jobs();

-- 6. Check if RPC functions exist
SELECT proname, prokind, prosecdef as security_definer
FROM pg_proc
WHERE proname LIKE 'get_%'
ORDER BY proname;
