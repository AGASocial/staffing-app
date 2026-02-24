# How to Clear Caches in Supabase/PostgreSQL

## 1. **PostgREST Cache** (Most Important)
This is what exposes your database to the API.

```sql
-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
```

**Then wait 30-60 seconds** for PostgREST to pick up changes.

---

## 2. **PostgreSQL Function Cache**
Functions are compiled and cached in memory. To force a rebuild:

```sql
-- Option A: Drop and recreate (what we did)
DROP FUNCTION IF EXISTS public.get_staffing_jobs();
CREATE OR REPLACE FUNCTION public.get_staffing_jobs() ...

-- Option B: Use CREATE OR REPLACE (sometimes doesn't fully clear cache)
-- Avoid this - use DROP + CREATE instead

-- Option C: Clear ALL cached plans (nuclear option, affects all connections)
DISCARD PLANS;  -- This only works in your current session
```

---

## 3. **Browser Cache**
Clear your browser's cache before testing:

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Or use **Ctrl+Shift+Delete** to open browser DevTools cache clearer.

---

## 4. **NextJS Dev Server Cache**
Turbopack caches compiled code:

```bash
# Kill dev server
pkill -f "next dev"

# Clear Turbopack cache
rm -rf .next .turbopack

# Restart
npm run dev
```

---

## 5. **API Response Cache**
Your API sets cache headers:

```typescript
res.headers.set('Cache-Control', 'no-store, max-age=0');
```

This is already done ✅ but make sure your browser isn't caching anyway:

```bash
# In browser DevTools:
# Settings → Network → Check "Disable cache (while DevTools is open)"
```

---

## 6. **PostgreSQL Connection Pool**
Supabase uses pgBouncer for connection pooling. It caches connections.

**There's no direct way to clear pgBouncer from SQL**, but:
- Restarting the Supabase project clears it
- Or wait a few minutes for connections to idle and reconnect

---

## 7. **DNS/Network Cache**
If using a domain name:

```bash
# Linux/Mac
sudo dscacheutil -flushcache

# Windows
ipconfig /flushdns
```

---

## **Complete Nuclear Option (Reset Everything)**

Run in Supabase SQL Editor:

```sql
-- 1. Force function rebuild
DROP FUNCTION IF EXISTS public.get_staffing_jobs() CASCADE;

-- 2. Verify RLS policy
DROP POLICY IF EXISTS "staffing_jobs_allow_all" ON public.staffing_jobs;
CREATE POLICY "staffing_jobs_allow_all"
  ON public.staffing_jobs FOR ALL TO anom, authenticated, service_role
  USING (true) WITH CHECK (true);

-- 3. Recreate function
CREATE OR REPLACE FUNCTION public.get_staffing_jobs()
RETURNS SETOF public.staffing_jobs
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET role = 'service_role'
AS $$
  SELECT * FROM public.staffing_jobs ORDER BY created_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_staffing_jobs() TO anom, authenticated, service_role;

-- 4. Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- 5. Test
SELECT * FROM get_staffing_jobs();
```

Then:

```bash
# Kill and restart dev server
pkill -f "next dev"
rm -rf .next .turbopack
npm run dev

# Clear browser
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

# Reload the page
```

---

## **Quick Checklist**

✅ Run SQL nuclear option above
✅ Wait 60 seconds for PostgREST to reload
✅ Kill dev server: `pkill -f "next dev"`
✅ Clear cache: `rm -rf .next .turbopack`
✅ Restart: `npm run dev`
✅ Clear browser cache: `Ctrl+Shift+Delete`
✅ Hard reload browser: `Ctrl+Shift+R`
✅ Test API: Navigate to jobs page
✅ Check server logs for `[GET /api/jobs] Returning 3 records`

---

## **If Still Empty After All This**

The issue is likely:
1. **RLS policy still blocking** → Check `SELECT * FROM get_staffing_jobs()` in SQL editor
2. **Function not getting called** → Add more logging to see if RPC is even executing
3. **Data actually deleted** → Check `SELECT COUNT(*) FROM public.staffing_jobs` returns 3

Run those diagnostic queries in SQL Editor to verify the function works there first.
