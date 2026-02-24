import { NextResponse } from 'next/server';

/**
 * GET /api/cron/trigger
 * Called by Vercel Cron (see vercel.json). Verifies User-Agent then forwards to
 * /api/cron/outbound-calls with CRON_SECRET so the actual route can stay protected.
 */
export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';
  if (!userAgent.includes('vercel-cron')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secret = process.env.CRON_SECRET ?? process.env.AUTO_CALL_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET or AUTO_CALL_CRON_SECRET not set' },
      { status: 503 }
    );
  }

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : new URL(request.url).origin;
  const url = `${base}/api/cron/outbound-calls`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
