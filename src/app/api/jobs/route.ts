import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/jobs – list all job postings
 * Uses RPC get_staffing_jobs() so data is returned even when PostgREST table cache is stale.
 */
export async function GET() {
  const { supabase, user } = await createAuthenticatedRouteClient();

  if (!user) {
    console.warn('[GET /api/jobs] No user found - unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[GET /api/jobs] User authenticated:', user.id);

  const { data, error } = await supabaseAdmin.rpc('get_staffing_jobs');

  console.log('[GET /api/jobs] RPC result:', { dataCount: Array.isArray(data) ? data.length : 'not-array', error: error?.message });

  if (error) {
    console.error('[GET /api/jobs] RPC error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = Array.isArray(data) ? data : [];
  console.log('[GET /api/jobs] Returning', list.length, 'records');

  const res = NextResponse.json(list);
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}

/**
 * POST /api/jobs – create a job posting
 */
export async function POST(request: Request) {
  const { user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, location, pay_range, shift, description, requirements_json, recruiter_emails } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const shiftValue = typeof shift === 'string' && shift.trim() ? shift.trim() : '1st_shift';

    const { data, error } = await supabaseAdmin
      .from('staffing_jobs')
      .insert({
        title: title.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        location: location?.trim() || null,
        pay_range: pay_range?.trim() || null,
        shift: shiftValue,
        requirements_json: requirements_json ?? null,
        recruiter_emails: Array.isArray(recruiter_emails) ? recruiter_emails : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
