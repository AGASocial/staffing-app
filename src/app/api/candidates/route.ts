import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import type { CreateCandidatePayload } from '@/models/candidate';

/**
 * GET /api/candidates
 * Returns all candidates, ordered by creation date (newest first).
 * Optional query params: ?pipeline_status=applied&search=name
 */
export async function GET(request: Request) {
  const { supabase, user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pipelineStatus = searchParams.get('pipeline_status');
  const search = searchParams.get('search');

  let query = supabase
    .from('staffing_candidates')
    .select('*')
    .order('created_at', { ascending: false });

  if (pipelineStatus) {
    query = query.eq('pipeline_status', pipelineStatus);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/candidates
 * Creates a new candidate.
 */
export async function POST(request: Request) {
  const { supabase, user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateCandidatePayload = await request.json();
    const { name, email, phone, source, notes, skills, location, availability, pipeline_status } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'name, email, and phone are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('staffing_candidates')
      .insert({
        name,
        email,
        phone,
        source: source ?? null,
        notes: notes ?? null,
        skills: skills ?? null,
        location: location ?? null,
        availability: availability ?? null,
        pipeline_status: pipeline_status ?? 'applied',
        status: 'active',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating candidate:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
