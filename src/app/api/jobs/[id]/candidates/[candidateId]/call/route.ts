import { NextResponse } from 'next/server';
import { createAuthenticatedRouteClient } from '@/lib/supabase-server';
import { createOutboundCall } from '@/lib/outbound-call';

/**
 * POST /api/jobs/[jobId]/candidates/[candidateId]/call
 * Start an outbound Retell call to the candidate with job context.
 * Requires auth. Uses shared createOutboundCall (RETELL_API_KEY, RETELL_FROM_NUMBER).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const { user } = await createAuthenticatedRouteClient();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId, candidateId } = await params;
  if (!jobId || !candidateId) {
    return NextResponse.json(
      { error: 'Job id and candidate id are required' },
      { status: 400 }
    );
  }

  const result = await createOutboundCall(jobId, candidateId);

  if (result.ok) {
    return NextResponse.json({
      callId: result.callId,
      message: 'Call started',
    });
  }

  if (result.error === 'Retell is not configured (RETELL_API_KEY, RETELL_FROM_NUMBER)') {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  if (result.error === 'Job not found' || result.error === 'Candidate not found') {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (result.error === 'Candidate is not an applicant for this job' || result.error === 'Candidate has no phone number') {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(
    { error: result.error },
    { status: 502 }
  );
}
