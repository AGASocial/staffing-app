import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { UpdateCandidatePayload } from '@/models/candidate';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/candidates/[id]
 * Returns a single candidate with their voice insights.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: candidate, error } = await supabase
    .from('staffing_candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  // Fetch voice insights for this candidate
  const { data: insights } = await supabase
    .from('staffing_voice_insights')
    .select('*')
    .eq('candidate_id', id)
    .order('created_at', { ascending: false });

  // Fetch applications (which jobs this candidate applied to)
  const { data: applications } = await supabase
    .from('staffing_applications')
    .select('*, job:staffing_jobs(id, title, client_name, location)')
    .eq('candidate_id', id)
    .order('applied_at', { ascending: false });

  return NextResponse.json({
    ...candidate,
    insights: insights ?? [],
    applications: applications ?? [],
  });
}

/**
 * PUT /api/candidates/[id]
 * Updates a candidate's profile or pipeline status.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: UpdateCandidatePayload = await request.json();

    // Whitelist updatable fields
    const updateData: Record<string, unknown> = {};
    const allowed: (keyof UpdateCandidatePayload)[] = [
      'name', 'email', 'phone', 'source', 'notes',
      'skills', 'location', 'availability', 'pipeline_status',
      'voice_screening_summary', 'voice_screening_disposition',
      'last_call_id', 'resume_url', 'resume_file_name',
    ];
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('staffing_candidates')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating candidate:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * DELETE /api/candidates/[id]
 * Deletes a candidate and their resume file from storage.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { supabase, user } = await createAuthenticatedRouteClient();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch candidate to get resume_url before deleting
  const { data: candidate } = await supabase
    .from('staffing_candidates')
    .select('resume_url')
    .eq('id', id)
    .single();

  // Remove resume from storage if present
  if (candidate?.resume_url) {
    await supabaseAdmin.storage.from('resumes').remove([candidate.resume_url]);
  }

  const { error } = await supabase
    .from('staffing_candidates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
