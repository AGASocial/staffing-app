# Supabase Staffing Jobs Query Issue - Diagnosis & Solutions

## Problem Summary
Records exist in `staffing_jobs` table but queries return `[]` (empty array) after Supabase project restart.

---

## Root Cause Analysis

### Migration Conflict History
Your project has a **migration sequence conflict**:

1. **20260223000000_create_jobs_and_candidates.sql**
   - Created: `public.staffing_jobs` table
   - RLS Policy: Only `authenticated` role allowed

2. **20260223110000_staffing_schema_tables.sql**
   - Created: NEW `staffing` schema (separate)
   - Created: `staffing.jobs`, `staffing.candidates`, `staffing.applications`
   - RLS Policy: Only `authenticated` role allowed
   - **Result**: Now you have TWO places with job data!

3. **20260223140000_public_staffing_tables.sql**
   - Dropped: `public.staffing_applications`, `public.staffing_candidates`, `public.staffing_jobs`
   - Recreated: `public.staffing_jobs` (new structure)
   - **Result**: Public tables recreated, but `staffing` schema still has old data

4. **20260224110000_drop_staffing_schema.sql**
   - **Dropped entire `staffing` schema** with `DROP SCHEMA IF EXISTS staffing CASCADE`
   - **This deleted ALL data** in that schema!

### Why Empty Array After Restart?

When Supabase restarts:
1. Migrations execute in chronological order
2. The `DROP SCHEMA staffing CASCADE` removes everything in that schema
3. New `public.staffing_jobs` table is created but it's **EMPTY**
4. Existing records were never migrated from `staffing.jobs` to `public.staffing_jobs`

### Current State Check

**Your code queries:**
```typescript
// /src/app/api/jobs/route.ts
const { data, error } = await supabaseAdmin.rpc('get_staffing_jobs');
// Falls back to:
.from('staffing_jobs')  // ← Queries public.staffing_jobs (EMPTY after restart)
```

**RLS Policy Issue:**
- Latest migration allows `anon` AND `authenticated`
- Original migrations only allowed `authenticated`
- This causes behavior differences depending on which migration ran last

---

## Solutions

### Option 1: Restore Data from Backup (BEST if data is critical)
If you have data that must be preserved:

```sql
-- Check if staffing schema still exists (unlikely after migration 20260224110000)
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'staffing';

-- If it exists, check what's there:
SELECT COUNT(*) FROM staffing.jobs;
SELECT * FROM staffing.jobs LIMIT 5;

-- If data exists, copy to public schema:
INSERT INTO public.staffing_jobs (id, title, description, client_name, location, pay_type, pay_range, shift, job_type, status, requirements_json, recruiter_emails, start_date, duration, created_at, updated_at)
SELECT id, title, description, client_name, location, pay_type, pay_range, shift, job_type, status, requirements_json, recruiter_emails, start_date, duration, created_at, updated_at
FROM staffing.jobs;
```

### Option 2: Clean Up Migrations (RECOMMENDED)

Delete the conflicting migrations to prevent this on next restart:

```bash
cd /sessions/relaxed-keen-lamport/mnt/staffing-app/supabase/migrations

# These should be deleted (they create schema conflicts):
rm 20260223110000_staffing_schema_tables.sql
rm 20260223120000_staffing_schema_grants.sql
rm 20260223130000_staffing_rls_anon_select.sql
rm 20260223150000_rename_jobs_candidates_to_staffing.sql
rm 20260224110000_drop_staffing_schema.sql
rm 20260223150000_public_staffing_voice_insights.sql  # (if it's in staffing schema)

# Keep only the clean ones:
# - 20260223000000_create_jobs_and_candidates.sql (or use 20260223140000 version)
# - 20260223140000_public_staffing_tables.sql (latest clean version)
# - 20260224100000_postgrest_reload_on_ddl.sql
# - 20260224120000_rpc_get_staffing_jobs.sql
```

### Option 3: Create a Consolidation Migration (SAFE)

Create a new migration that:
1. Ensures `public.staffing_jobs` exists with latest schema
2. Clears up any schema conflicts
3. Resets RLS policies correctly

**File:** `supabase/migrations/20260224130000_consolidate_staffing_tables.sql`

```sql
-- Consolidate staffing tables in public schema only
-- This migration cleans up the schema mess from previous migrations

-- Drop old conflicts if they exist
DROP SCHEMA IF EXISTS staffing CASCADE;
DROP TABLE IF EXISTS public.staffing_applications_old;
DROP TABLE IF EXISTS public.staffing_candidates_old;
DROP TABLE IF EXISTS public.staffing_jobs_old;

-- Ensure public tables exist with correct schema
CREATE TABLE IF NOT EXISTS public.staffing_jobs (
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

CREATE TABLE IF NOT EXISTS public.staffing_candidates (
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

CREATE TABLE IF NOT EXISTS public.staffing_applications (
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

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_staffing_applications_job_id;
DROP INDEX IF EXISTS idx_staffing_applications_candidate_id;
DROP INDEX IF EXISTS idx_staffing_jobs_status;
DROP INDEX IF EXISTS idx_staffing_candidates_status;

-- Create indexes
CREATE INDEX idx_staffing_applications_job_id ON public.staffing_applications(job_id);
CREATE INDEX idx_staffing_applications_candidate_id ON public.staffing_applications(candidate_id);
CREATE INDEX idx_staffing_jobs_status ON public.staffing_jobs(status);
CREATE INDEX idx_staffing_candidates_status ON public.staffing_candidates(status);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow read write staffing_jobs" ON public.staffing_jobs;
DROP POLICY IF EXISTS "Allow read write staffing_candidates" ON public.staffing_candidates;
DROP POLICY IF EXISTS "Allow read write staffing_applications" ON public.staffing_applications;
DROP POLICY IF EXISTS "Authenticated users can manage staffing_jobs" ON public.staffing_jobs;
DROP POLICY IF EXISTS "Authenticated users can manage staffing_candidates" ON public.staffing_candidates;
DROP POLICY IF EXISTS "Authenticated users can manage staffing_applications" ON public.staffing_applications;

-- Enable RLS
ALTER TABLE public.staffing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_applications ENABLE ROW LEVEL SECURITY;

-- Allow both anonymous and authenticated users (matches latest migration intent)
CREATE POLICY "Allow all users staffing_jobs"
  ON public.staffing_jobs FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all users staffing_candidates"
  ON public.staffing_candidates FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all users staffing_applications"
  ON public.staffing_applications FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Trigger PostgREST reload
NOTIFY pgrst, 'reload schema';
```

---

## Immediate Action Items

### 1. Check Current Data Location
```bash
# Run this in Supabase SQL Editor to see where your data is:
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'staffing';

-- If staffing schema exists:
SELECT COUNT(*) as job_count FROM staffing.jobs;
SELECT COUNT(*) as job_count_public FROM public.staffing_jobs;
```

### 2. Test the Debug Endpoint
```bash
curl http://localhost:3000/api/debug/jobs
```

This endpoint already handles all the diagnosis:
- Shows which RPC function works
- Falls back to table query if RPC fails
- Shows row count from both sources

### 3. Apply Solution Based on Data Location

**If data is in `staffing.jobs`:**
→ Use **Option 1** (restore) or **Option 3** (consolidation migration)

**If data is lost:**
→ Use **Option 2** (clean up migrations) and re-add test data

**If only public tables are empty:**
→ Insert test records and move forward

---

## Why This Happened

Your migration strategy evolved over time:
- Started with `public.staffing_*` tables (migration 20260223000000)
- Switched to `staffing` schema approach (20260223110000)
- Switched BACK to `public` tables (20260223140000)
- Tried to clean up (20260224110000) but lost data

**Best Practice:** Have ONE canonical schema/table structure and evolve it with `ALTER TABLE`, not `CREATE` + `DROP` sequences.

---

## Prevention for Future

1. **Single source of truth:** Keep staffing tables in `public` schema
2. **Use migrations for schema evolution:** `ALTER TABLE` instead of `DROP`/`CREATE`
3. **Test migration sequence:** Verify migrations run in correct order without data loss
4. **Add data migration:** If changing table structure, include data migration in same migration file

Example safe migration pattern:
```sql
-- Create new column
ALTER TABLE public.staffing_jobs ADD COLUMN new_field text;

-- Copy data from old column if renaming
UPDATE public.staffing_jobs SET new_field = old_field;

-- Drop old column (in a separate migration if concerned)
ALTER TABLE public.staffing_jobs DROP COLUMN old_field;
```

---

## Next Steps

1. **Diagnose:** Check SQL Editor to find where your data is
2. **Decide:** Choose Option 1, 2, or 3 above
3. **Test:** Run `/api/debug/jobs` endpoint to verify fixes
4. **Verify:** Check that `/api/jobs` returns records
5. **Prevent:** Clean up conflicting migrations going forward
