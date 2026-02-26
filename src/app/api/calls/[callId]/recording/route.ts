import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';

/**
 * GET /api/calls/[callId]/recording
 * Returns the Retell call recording URL for the given call_id.
 * Requires auth. Uses RETELL_API_KEY to call Retell Get Call API.
 * @see https://docs.retellai.com/api-references/get-call
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { user } = await createAuthenticatedRouteClient();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { callId } = await params;
  if (!callId?.trim()) {
    return NextResponse.json({ error: 'Call id required' }, { status: 400 });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Recording service not configured' },
      { status: 503 }
    );
  }

  const res = await fetch(
    `https://api.retellai.com/v2/get-call/${encodeURIComponent(callId.trim())}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: 'Invalid recording service config' }, { status: 503 });
    }
    if (res.status === 422 || res.status === 404) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { message?: string }).message ?? 'Failed to get call' },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { recording_url?: string | null };
  const recordingUrl = data.recording_url ?? null;

  if (!recordingUrl) {
    return NextResponse.json(
      { error: 'Recording not available yet' },
      { status: 404 }
    );
  }

  return NextResponse.json({ recording_url: recordingUrl });
}
