import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/dashboard
 * Returns staffing-focused stats and recent data: jobs, applicants, voice calls.
 */
export async function GET() {
  const { user } = await createAuthenticatedRouteClient();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: jobs, error: jobsError } = await supabaseAdmin.rpc('get_staffing_jobs');

    if (jobsError) {
      console.error('Dashboard: get_staffing_jobs error', jobsError);
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    const jobList = Array.isArray(jobs) ? jobs : [];
    const jobIds = jobList.map((j: { id: string }) => j.id);

    let totalApplicants = 0;
    let totalCalls = 0;
    let recentCalls: { id: number; job_id: string; summary: string | null; created_at: string | null; disposition: string | null; call_status: string | null }[] = [];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoIso = weekAgo.toISOString();
    let callsThisWeek = 0;

    if (jobIds.length > 0) {
      const [appRes, insightsRes, callsCountRes, weekCountRes] = await Promise.all([
        supabaseAdmin
          .from('staffing_applications')
          .select('id', { count: 'exact', head: true })
          .in('job_id', jobIds),
        supabaseAdmin
          .from('staffing_voice_insights')
          .select('id, job_id, summary, created_at, disposition, call_status')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false })
          .limit(3),
        supabaseAdmin
          .from('staffing_voice_insights')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds),
        supabaseAdmin
          .from('staffing_voice_insights')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds)
          .gte('created_at', weekAgoIso),
      ]);

      totalApplicants = appRes.count ?? 0;
      const insights = insightsRes.data ?? [];
      totalCalls = callsCountRes.count ?? 0;
      callsThisWeek = weekCountRes.count ?? 0;
      recentCalls = insights;
    }

    const recentJobs = jobList.slice(0, 4);

    const stats = {
      totalJobs: jobList.length,
      totalApplicants,
      totalCalls,
      callsThisWeek,
    };

    return NextResponse.json({
      stats,
      recentJobs,
      recentCalls,
    });
  } catch (e) {
    console.error('Dashboard fetch error:', e);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
