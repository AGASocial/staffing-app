import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient, checkSecuritySession } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/insights
 * Fetches rows from staffing_voice_insights.
 * Uses service role client after auth check so results are not blocked by RLS/PostgREST.
 */
export async function GET() {
  const { supabase, user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasSecuritySession = await checkSecuritySession();
  if (!hasSecuritySession) {
    await supabase.from('users').select('security_pin_hash').eq('id', user.id).single();
    // if (userData?.security_pin_hash) {
    //   return NextResponse.json({ error: 'Security PIN required' }, { status: 403 });
    // }
  }

  const { data, error } = await supabaseAdmin
    .from('staffing_voice_insights')
    .select('id, json, summary, assistant_id, insight_id, conversation_id, created_at, direction, disposition, job_id, candidate_id, call_id, call_status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error fetching insights:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
