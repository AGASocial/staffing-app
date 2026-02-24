import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/jobs/[id]/insights – fetch voice insights for a job (outbound call results).
 * Returns rows from staffing_voice_insights where job_id = id, newest first.
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

  const { data, error } = await supabaseAdmin
    .from('staffing_voice_insights')
    .select('id, json, summary, assistant_id, insight_id, conversation_id, created_at, direction, disposition, job_id, candidate_id, call_id, call_status')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error fetching job insights:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
