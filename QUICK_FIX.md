# Quick Fix - Empty staffing_jobs Query

## Step 1: Diagnose Where Your Data Is

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Paste the contents of `supabase_diagnose.sql`
3. Run it and check:
   - **Does `staffing` schema exist?** → Check "SCHEMA CHECK" section
   - **How many records in `public.staffing_jobs`?** → Check count
   - **Are there records in `staffing.jobs`?** → Data is in OLD schema

## Step 2: Choose Your Fix

### If data is in `public.staffing_jobs` (good case)
- Tables are correct, data is there
- Problem: RLS policies or PostgREST cache
- **Action:** Run this SQL in Supabase SQL Editor:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
- Wait 30 seconds and test your API

### If data is in `staffing.jobs` (data in old schema)
- Need to migrate data to new location
- **Action:** Run this SQL in Supabase SQL Editor:
  ```sql
  INSERT INTO public.staffing_jobs
    (id, title, description, client_name, location, pay_type, pay_range, shift, job_type, status, requirements_json, recruiter_emails, start_date, duration, created_at, updated_at)
  SELECT
    id, title, description, client_name, location, pay_type, pay_range, shift, job_type, status, requirements_json, recruiter_emails, start_date, duration, created_at, updated_at
  FROM staffing.jobs;
  ```
- Then drop the old schema:
  ```sql
  DROP SCHEMA staffing CASCADE;
  ```

### If both are empty (data was lost)
- Clean up migrations to prevent future issues
- **Action:**
  ```bash
  cd supabase/migrations
  # Delete these conflicting migrations:
  rm 20260223110000_staffing_schema_tables.sql
  rm 20260223120000_staffing_schema_grants.sql
  rm 20260223130000_staffing_rls_anon_select.sql
  rm 20260223150000_rename_jobs_candidates_to_staffing.sql
  rm 20260223150000_public_staffing_voice_insights.sql
  rm 20260224110000_drop_staffing_schema.sql
  ```
- Add test data via API or SQL Editor

## Step 3: Verify Fix

Test your API endpoint:
```bash
# Debug endpoint (shows detailed diagnostic info)
curl http://localhost:3000/api/debug/jobs

# Main endpoint (should return jobs array)
curl http://localhost:3000/api/jobs
```

Expected response:
```json
[
  {
    "id": "...",
    "title": "Job Title",
    "location": "...",
    ...
  }
]
```

## Step 4: Prevent Future Issues

Create consolidation migration:
1. Copy the SQL from `SUPABASE_DIAGNOSIS.md` → Option 3
2. Save as: `supabase/migrations/20260224130000_consolidate_staffing_tables.sql`
3. This ensures single source of truth going forward

---

## What Went Wrong (Short Version)

Your migrations created tables in THREE places:
1. `public.staffing_jobs` (initial)
2. `staffing.jobs` (renamed to separate schema)
3. `public.staffing_jobs` again (migrated back)

When Supabase restarted, migrations ran in order and dropped the `staffing` schema, leaving `public.staffing_jobs` empty because the data was never migrated.

---

## Quick Reference

| Issue | Fix |
|-------|-----|
| Data in `staffing.jobs` but querying `public.staffing_jobs` | Migrate data + drop old schema (Step 2, option 2) |
| Empty tables, RLS policies wrong | PostgREST reload (Step 2, option 1) |
| Both empty, migration mess | Clean migrations + prevent future (Step 2, option 3 + Step 4) |

