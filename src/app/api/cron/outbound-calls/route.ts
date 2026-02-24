import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createOutboundCall } from '@/lib/outbound-call';

const DEFAULT_START = '09:00';
const DEFAULT_END = '16:30';
const DEFAULT_TZ = 'America/Chicago';
const DEFAULT_MAX_PER_RUN = 10;

function parseTime(s: string): { hours: number; minutes: number } {
  const match = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hours: 9, minutes: 0 };
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

function isWithinHours(
  startStr: string,
  endStr: string,
  tz: string
): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const currentMins = hour * 60 + minute;

  const start = parseTime(startStr);
  const end = parseTime(endStr);
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;

  return currentMins >= startMins && currentMins <= endMins;
}

/**
 * POST /api/cron/outbound-calls
 * Auto-call candidates for open jobs who have not yet been called (no outbound staffing_voice_insights).
 * Requires CRON_SECRET (Bearer or x-cron-secret header, or query param secret).
 * Only runs within configured hours (default 9:00–16:30 America/Chicago).
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.AUTO_CALL_CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const headerSecret = bearer ?? request.headers.get('x-cron-secret')?.trim() ?? null;
    const querySecret = new URL(request.url).searchParams.get('secret')?.trim() ?? null;
    const provided = headerSecret ?? querySecret;
    if (provided !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!process.env.RETELL_API_KEY || !process.env.RETELL_FROM_NUMBER) {
    return NextResponse.json(
      { error: 'Retell is not configured' },
      { status: 503 }
    );
  }

  const startStr = process.env.AUTO_CALL_START ?? DEFAULT_START;
  const endStr = process.env.AUTO_CALL_END ?? DEFAULT_END;
  const tz = process.env.AUTO_CALL_TZ ?? DEFAULT_TZ;
  const maxPerRun = Math.min(
    Math.max(1, parseInt(process.env.AUTO_CALL_MAX_PER_RUN ?? String(DEFAULT_MAX_PER_RUN), 10)),
    50
  );

  if (!isWithinHours(startStr, endStr, tz)) {
    return NextResponse.json(
      { skipped: true, reason: 'outside_hours', start: startStr, end: endStr, tz },
      { status: 200 }
    );
  }

  const { data: applications } = await supabaseAdmin
    .from('staffing_applications')
    .select('job_id, candidate_id, applied_at')
    .order('applied_at', { ascending: true })
    .limit(500);

  if (!applications?.length) {
    return NextResponse.json({ called: 0, failed: 0, results: [] }, { status: 200 });
  }

  const jobIds = [...new Set(applications.map((a) => a.job_id))];
  const candidateIds = [...new Set(applications.map((a) => a.candidate_id))];

  const [jobsRes, candidatesRes, insightsRes] = await Promise.all([
    supabaseAdmin.from('staffing_jobs').select('id').in('id', jobIds).eq('status', 'open'),
    supabaseAdmin.from('staffing_candidates').select('id, phone').in('id', candidateIds),
    supabaseAdmin
      .from('staffing_voice_insights')
      .select('job_id, candidate_id, call_status')
      .eq('direction', 'outbound')
      .not('job_id', 'is', null)
      .not('candidate_id', 'is', null),
  ]);

  const openJobIds = new Set((jobsRes.data ?? []).map((j) => j.id));
  const candidateHasPhone = new Set(
    (candidatesRes.data ?? []).filter((c) => (c.phone ?? '').trim().length >= 10).map((c) => c.id)
  );
  const alreadyCalled = new Set(
    (insightsRes.data ?? []).map((v) => `${v.job_id}:${v.candidate_id}`)
  );

  const toCall: { job_id: string; candidate_id: string }[] = [];
  for (const a of applications) {
    if (toCall.length >= maxPerRun) break;
    if (
      !openJobIds.has(a.job_id) ||
      !candidateHasPhone.has(a.candidate_id) ||
      alreadyCalled.has(`${a.job_id}:${a.candidate_id}`)
    ) {
      continue;
    }
    toCall.push({ job_id: a.job_id, candidate_id: a.candidate_id });
  }

  const results: { job_id: string; candidate_id: string; callId?: string; error?: string }[] = [];
  let called = 0;
  let failed = 0;

  for (const { job_id, candidate_id } of toCall) {
    const result = await createOutboundCall(job_id, candidate_id);
    if (result.ok) {
      called += 1;
      results.push({ job_id, candidate_id, callId: result.callId });
    } else {
      failed += 1;
      results.push({ job_id, candidate_id, error: result.error });
    }
  }

  return NextResponse.json(
    { called, failed, results },
    { status: 200 }
  );
}
