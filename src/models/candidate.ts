/**
 * Pipeline status values for a candidate.
 */
export type CandidatePipelineStatus =
  | 'applied'
  | 'screened'
  | 'interviewed'
  | 'placed'
  | 'inactive';

export const PIPELINE_STATUSES: CandidatePipelineStatus[] = [
  'applied',
  'screened',
  'interviewed',
  'placed',
  'inactive',
];

export type CandidateSource = 'linkedin' | 'indeed' | 'website' | 'referral' | 'other';

/**
 * Full candidate profile (standalone, not tied to a specific job).
 * Corresponds to the staffing_candidates table.
 */
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string | null;
  /** Legacy generic status field */
  status: string;
  /** Staffing pipeline stage */
  pipeline_status: CandidatePipelineStatus;
  notes: string | null;
  /** Supabase storage path for the resume file */
  resume_url: string | null;
  /** Original file name of the uploaded resume */
  resume_file_name: string | null;
  /** Comma-separated skills */
  skills: string | null;
  location: string | null;
  availability: string | null;
  /** Auto-populated from Retell AI voice screening call */
  voice_screening_summary: string | null;
  voice_screening_disposition: string | null;
  last_call_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Payload for creating a new candidate.
 */
export interface CreateCandidatePayload {
  name: string;
  email: string;
  phone: string;
  source?: string | null;
  notes?: string | null;
  skills?: string | null;
  location?: string | null;
  availability?: string | null;
  pipeline_status?: CandidatePipelineStatus;
}

/**
 * Payload for updating an existing candidate.
 */
export type UpdateCandidatePayload = Partial<CreateCandidatePayload> & {
  pipeline_status?: CandidatePipelineStatus;
  voice_screening_summary?: string | null;
  voice_screening_disposition?: string | null;
  last_call_id?: string | null;
  resume_url?: string | null;
  resume_file_name?: string | null;
};
