# Debug: Jobs API returns []

Use this when `GET /api/jobs` returns `[]` or the Jobs page shows no jobs.

## 1. Confirm DB and env (no auth)

**Request:** `GET http://localhost:3000/api/debug/jobs`

This endpoint does **not** require login. It uses the same env vars and runs a direct query on `staffing_jobs`.

- **`ok: true`, `count > 0`**  
  Env and DB are correct; the app is talking to the right project and the table has rows. The issue is likely **auth** (step 2).

- **`ok: false` or `count: 0`**  
  Check:
  - `.env` / `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
  - `projectRef` in the response: it should match your Supabase project ref (e.g. `lrnhrzpwgyhkruwxeppw`). If it’s different, your URL points to another project where `staffing_jobs` may be empty.

- **`error` in the response**  
  Use `error.message` and `error.code` to fix the query or permissions.

- **`PGRST002` – "Could not query the database for the schema cache. Retrying."**  
  PostgREST failed to build its schema cache (often after a schema change or drop). Wait **30–60 seconds** and try again; PostgREST retries automatically. If it persists, in Supabase Dashboard go to **Project Settings → General → Restart project** to get a clean PostgREST process.

## 2. Confirm auth for the main Jobs API

**Request:** `GET http://localhost:3000/api/jobs`  
**Must be same browser session where you’re logged in** (cookies sent).

- **200 with `[]`**  
  Auth is OK; Supabase returned no rows. If step 1 showed `count > 0`, the main route may be using a different client or project (should not happen after using `supabaseAdmin`).

- **401 Unauthorized**  
  Session missing or expired. Log in again; ensure cookies are sent (same origin, `credentials: "include"`). Check browser console for: `Jobs fetch: Unauthorized – session may be missing or expired`.

- **500**  
  Check server logs for the Supabase error message.

## 3. Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (Dashboard → Project Settings → API → `service_role`).
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is `https://<project-ref>.supabase.co` for the project that has `staffing_jobs`.
- [ ] Restart dev server after changing `.env`.
- [ ] `/api/debug/jobs` returns `count > 0` for that project.
- [ ] You are logged in when opening the Jobs page; no 401 on `/api/jobs`.

## 4. Remove debug route in production

`/api/debug/jobs` is for local debugging. Disable or protect it in production (e.g. check `NODE_ENV` or a secret query param).
