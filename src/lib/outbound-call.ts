import { supabaseAdmin } from '@/lib/supabase-admin';
import type { JobRequirementsJson } from '@/models/job';

/**
 * Normalize phone to E.164. If 10 digits (US), prefix with +1.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export type CreateOutboundCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string };

/**
 * Create one outbound Retell call for the given job and candidate.
 * Uses RETELL_API_KEY, RETELL_FROM_NUMBER, optional RETELL_AGENT_ID.
 * Caller must ensure job/candidate/application exist and candidate has phone.
 */
export async function createOutboundCall(
  jobId: string,
  candidateId: string
): Promise<CreateOutboundCallResult> {
  const apiKey = process.env.RETELL_API_KEY;
  const fromNumber = process.env.RETELL_FROM_NUMBER;
  if (!apiKey || !fromNumber) {
    return { ok: false, error: 'Retell is not configured (RETELL_API_KEY, RETELL_FROM_NUMBER)' };
  }

  const [jobRes, candidateRes, applicationRes] = await Promise.all([
    supabaseAdmin
      .from('staffing_jobs')
      .select('id, title, description, location, pay_range, shift, requirements_json')
      .eq('id', jobId)
      .single(),
    supabaseAdmin
      .from('staffing_candidates')
      .select('id, name, phone')
      .eq('id', candidateId)
      .single(),
    supabaseAdmin
      .from('staffing_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .maybeSingle(),
  ]);

  if (jobRes.error || !jobRes.data) {
    return { ok: false, error: 'Job not found' };
  }
  if (candidateRes.error || !candidateRes.data) {
    return { ok: false, error: 'Candidate not found' };
  }
  if (!applicationRes.data) {
    return { ok: false, error: 'Candidate is not an applicant for this job' };
  }

  const job = jobRes.data;
  const candidate = candidateRes.data;
  const phone = (candidate.phone || '').trim();
  if (!phone) {
    return { ok: false, error: 'Candidate has no phone number' };
  }

  const toNumber = toE164(phone);
  const requirements = (job.requirements_json as JobRequirementsJson | null) ?? {};
  const questions = requirements.interview_questions ?? [];
  const screening_questions =
    questions.length > 0 ? questions.join('\n') : 'No specific questions provided.';

  const retell_llm_dynamic_variables: Record<string, string> = {
    candidate_name: candidate.name || 'the candidate',
    job_title: job.title || 'the position',
    job_description: (job.description || '').trim() || 'No additional description.',
    job_location: job.location || 'No location provided.',
    job_pay_range: job.pay_range || 'No pay range provided.',
    job_shift: job.shift || 'No shift provided.',
    screening_questions,
    job_id: jobId,
    candidate_id: candidateId,
    application_id: applicationRes.data.id,
  };

  const body: {
    from_number: string;
    to_number: string;
    override_agent_id?: string;
    retell_llm_dynamic_variables: Record<string, string>;
    metadata?: Record<string, string>;
  } = {
    from_number: fromNumber.trim(),
    to_number: toNumber,
    retell_llm_dynamic_variables,
    metadata: {
      job_id: jobId,
      candidate_id: candidateId,
    },
  };

  const agentId = process.env.RETELL_AGENT_ID?.trim();
  if (agentId) body.override_agent_id = agentId;

  const res = await fetch('https://api.retellai.com/v2/create-phone-call', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.detail ?? data?.message ?? data?.error ?? `Retell returned ${res.status}`;
    console.error('[Retell create-phone-call]', res.status, data);
    return {
      ok: false,
      error: typeof message === 'string' ? message : 'Failed to start call',
    };
  }

  const callId = data.call_id ?? data.id ?? '';
  return { ok: true, callId: String(callId) };
}
