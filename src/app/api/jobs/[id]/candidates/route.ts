import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/jobs/[id]/candidates – list applicants for a job (candidate + application status)
 * Uses service role after auth check so results are not blocked by RLS/PostgREST cache.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: 'Job id required' }, { status: 400 });
  }

  const { data: applications, error: appError } = await supabaseAdmin
    .from('staffing_applications')
    .select('id, status, applied_at, source, notes, candidate:staffing_candidates(id, name, email, phone, source, status)')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });

  if (appError) {
    console.error('Supabase error fetching applications:', appError);
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  // Flatten for UI: one object per application with candidate fields + application status
  // Supabase relation can return candidate as object or array depending on types
  type CandidateRow = { id: string; name: string; email: string; phone: string; source: string | null; status: string };
  type AppRow = { id: string; status: string; applied_at: string | null; source: string | null; notes: string | null; candidate: CandidateRow | CandidateRow[] | null };
  const list = (applications ?? []).map((row: AppRow) => {
    const c = Array.isArray(row.candidate) ? row.candidate[0] : row.candidate;
    return {
      id: c?.id ?? row.id,
      job_id: jobId,
      name: c?.name ?? '',
      email: c?.email ?? '',
      phone: c?.phone ?? '',
      source: c?.source ?? row.source,
      application_id: row.id,
      application_status: row.status,
      applied_at: row.applied_at,
      notes: row.notes,
    };
  });

  return NextResponse.json(list);
}

/**
 * POST /api/jobs/[id]/candidates – add an applicant to a job (create/find candidate, then application)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: 'Job id required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, source } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const name_ = name.trim();
    const email_ = email.trim();
    const phone_ = phone.trim();
    const source_ = source?.trim() || null;

    // Find existing candidate by email or create new
    const { data: existing } = await supabaseAdmin
      .from('staffing_candidates')
      .select('id')
      .eq('email', email_)
      .limit(1)
      .maybeSingle();

    let candidateId: string;
    if (existing?.id) {
      candidateId = existing.id;
      await supabaseAdmin.from('staffing_candidates').update({ name: name_, phone: phone_, source: source_, updated_at: new Date().toISOString() }).eq('id', candidateId);
    } else {
      const { data: newCandidate, error: insertCErr } = await supabaseAdmin
        .from('staffing_candidates')
        .insert({ name: name_, email: email_, phone: phone_, source: source_ })
        .select('id')
        .single();
      if (insertCErr) {
        console.error('Supabase error creating candidate:', insertCErr);
        return NextResponse.json({ error: insertCErr.message }, { status: 500 });
      }
      candidateId = newCandidate!.id;
    }

    const { data: application, error: appErr } = await supabaseAdmin
      .from('staffing_applications')
      .insert({ job_id: jobId, candidate_id: candidateId, source: source_ })
      .select()
      .single();

    if (appErr) {
      if (appErr.code === '23505') {
        return NextResponse.json({ error: 'This person has already applied to this job' }, { status: 409 });
      }
      console.error('Supabase error creating application:', appErr);
      return NextResponse.json({ error: appErr.message }, { status: 500 });
    }

    const out = {
      id: candidateId,
      job_id: jobId,
      name: name_,
      email: email_,
      phone: phone_,
      source: source_,
      application_id: application?.id,
      application_status: application?.status ?? 'applied',
      applied_at: application?.applied_at,
    };
    return NextResponse.json(out, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
