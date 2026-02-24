/**
 * Job posting (role the company is hiring for).
 */
/** Shape of requirements_json when storing interview/screening questions */
export interface JobRequirementsJson {
  interview_questions?: string[];
  [key: string]: unknown;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  pay_range: string | null;
  shift: string | null;
  requirements_json: JobRequirementsJson | null;
  recruiter_emails: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Candidate = applicant to a specific job (from LinkedIn, Indeed, etc.).
 */
export interface Candidate {
  id: string;
  job_id: string;
  name: string;
  email: string;
  phone: string;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CandidateSource = 'linkedin' | 'indeed' | 'website' | 'referral' | 'other';
