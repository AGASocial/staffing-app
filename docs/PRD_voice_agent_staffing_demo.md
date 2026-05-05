# Product Requirements Document (PRD)

## Product Name
Staffing Voice Agent Demo (Telnyx + Next.js)

## Document Version
v0.1 (Demo Scope)

## Background
Staffing teams lose time answering repetitive candidate questions and manually running first-pass screening calls. This demo showcases an AI voice workflow that handles high candidate volume 24/7 while giving recruiters immediate screening summaries.

This PRD is based on the flyer goals:
- Automatically answer candidate calls
- Conduct structured pre-screen interviews
- Collect candidate name/phone/email
- Confirm job preference
- Send instant recruiter summaries
- Reduce recruiter workload and speed placements

## Problem Statement
Recruiters spend too much time on repetitive early-stage phone interactions, leading to slower response times and inconsistent pre-screening quality.

## Goals
- Launch a working demo of inbound and outbound voice screening.
- Prove end-to-end flow from phone call to recruiter-facing summary/logs.
- Keep implementation lightweight (not a full production ATS replacement).

## Non-Goals (Demo)
- Full ATS integration with all systems
- Advanced scheduling automation across calendars
- Multi-language support
- Full compliance/legal workflow automation
- Production-grade analytics/BI

## Users
- Candidate: Calls in about a role or receives a screening call.
- Recruiter: Reviews call outcomes, transcripts, and screening answers.
- Staffing Ops/Admin: Configures job postings and screening questions.

## Scope

### Inbound Voice Agent (Candidate calls company number)
1. Answer call with job-aware greeting.
2. Share role details (title, location, pay range, shift, requirements).
3. Capture candidate contact details (name, phone, email).
4. Confirm job preference/interest.
5. Run short pre-screening questions (knockout + preference).
6. Provide outcome messaging:
   - Passed initial screen: "Recruiter will follow up."
   - Not qualified/incomplete: polite closure.
7. Store transcript, structured answers, and disposition.
8. Trigger instant email summary to recruiter.

### Outbound Voice Agent (Agent calls applicants)
1. Dial candidates from an uploaded applicant list.
2. Verify candidate identity and consent to continue.
3. Deliver role summary and ask if still interested.
4. Run same short pre-screening flow.
5. Handle no-answer, voicemail, retry strategy.
6. Save outcomes and notify recruiter.

### Next.js Demo App
1. Recruiter login (simple demo auth acceptable).
2. Call log list:
   - Direction (inbound/outbound)
   - Candidate name/phone/email
   - Job ID/title
   - Status/disposition
   - Timestamp and duration
3. Call detail page:
   - Transcript
   - Structured Q&A
   - Pass/Fail reason
   - Recording URL (if enabled)
4. Recruiter actions:
   - Mark reviewed
   - Add notes
   - Filter by job/status/date/direction
5. Basic metrics cards:
   - Total calls
   - Completed screens
   - Pass rate
   - Unreachable rate

---

## Total Talent Resources – Job & Candidate Management

**Client:** Total Talent Resources (staffing agency).  
**Focus:** Recruiter-facing management of job postings and candidates so the agency can run inbound/outbound voice screening against real roles and applicants.

### Requirements: Job Posting Management

| ID | Requirement | Priority |
|----|-------------|----------|
| J1 | Create, edit, and list job postings (title, location, pay range, shift). | P0 |
| J2 | Set job status: Draft, Open, On hold, Filled, Closed. | P0 |
| J3 | Optional: client name (who we’re staffing for), job type (contract / temp / temp-to-hire / direct hire). | P1 |
| J4 | Optional: description, requirements, start date, duration. | P1 |
| J5 | Assign recruiter email(s) per job for notifications. | P0 |
| J6 | Only Open jobs appear for voice agent and outbound campaigns. | P0 |

### Requirements: Candidate Management

| ID | Requirement | Priority |
|----|-------------|----------|
| C1 | Add candidates with name, email, phone; optional source (LinkedIn, Indeed, referral, etc.). | P0 |
| C2 | One candidate can apply to multiple jobs (applications = candidate + job link). | P0 |
| C3 | Track application status per job: Applied → Screening → Submitted to client → Interview → Offered → Placed / Rejected. | P0 |
| C4 | List candidates (global pool) and filter by job, status, source. | P0 |
| C5 | List applicants per job with application status and quick actions (e.g. Start outbound call). | P0 |
| C6 | Optional: candidate-level status (New, Contacted, Screening, Placed, Inactive), notes. | P1 |

### Requirements: Data & Security

| ID | Requirement | Priority |
|----|-------------|----------|
| D1 | All staffing data in Supabase in schema `staffing` (e.g. `staffing.jobs`, `staffing.candidates`, `staffing.applications`). | P0 |
| D2 | RLS: only authenticated users can read/write staffing data (single-tenant demo). | P0 |
| D3 | PII (name, email, phone) only in authenticated views; no public exposure. | P0 |

### Development Plan (translated from requirements)

| Phase | Deliverable | Requirements covered |
|-------|-------------|----------------------|
| **1. Data model** | Supabase migration: schema `staffing` with tables `jobs`, `candidates`, `applications` + RLS. | D1, D2 |
| **2. Job posting CRUD** | APIs + UI: list jobs, create/edit job (title, location, pay, shift, status, recruiter emails). Filter to “Open” for voice/outbound. | J1, J2, J5, J6 |
| **3. Candidate pool & applications** | APIs + UI: list/add/edit candidates; link candidate to job (create application); list applications per job with status. | C1, C2, C3, C5 |
| **4. Application status & filters** | UI: update application status; filter candidates by job/status/source. | C3, C4, C6 (partial) |
| **5. Voice & outbound wiring** | Outbound “Call” uses `staffing_applications` (or `staffing_candidates` + job context). Insights/call logs join to staffing_* for recruiter view. | J6, C5 |

### Data Model (schema `staffing`)

- **staffing.jobs** – id, title, description, client_name, location, pay_type, pay_range, shift, job_type, status, requirements_json, recruiter_emails, start_date, duration, created_at, updated_at  
  - status: draft \| open \| on_hold \| filled \| closed  
  - job_type: contract \| temp \| temp_to_hire \| direct_hire
- **staffing.candidates** – id, name, email, phone, source, status, notes, created_at, updated_at  
  - status: new \| contacted \| screening \| submitted \| placed \| inactive
- **staffing.applications** – id, job_id (FK), candidate_id (FK), status, applied_at, source, notes, created_at, updated_at  
  - status: applied \| screening \| submitted_to_client \| interview \| offered \| placed \| rejected  
  - Unique (job_id, candidate_id)

---

## Functional Requirements

### FR-1 Job Configuration
- Admin can define job records with:
  - Job title, location, pay range, shift type
  - Must-have requirements
  - Pre-screen question set
  - Recruiter email recipients

### FR-2 Conversation Guardrails
- Agent must stay within allowed knowledge:
  - Job details and company-approved FAQs
  - No legal advice, no policy improvisation
- If asked unknown questions, escalate or defer to recruiter.

### FR-3 Structured Pre-Screen
- Configurable question types:
  - Yes/No knockout
  - Multiple choice preference
  - Short open-ended response
- Must generate structured outputs for each answer.

### FR-4 Candidate Data Capture
- Capture and validate:
  - Full name
  - Phone number
  - Email address
- Confirm back to candidate to reduce errors.

### FR-5 Disposition Logic
- Standard outcomes:
  - `PASSED_PRESCREEN`
  - `FAILED_KNOCKOUT`
  - `CALLBACK_REQUESTED`
  - `INCOMPLETE`
  - `NO_ANSWER` (outbound)
  - `VOICEMAIL_LEFT` (outbound)

### FR-6 Notifications
- Send immediate recruiter email after each completed screen including:
  - Candidate identity
  - Job
  - Key answers
  - Outcome/disposition
  - Link to dashboard detail view

### FR-7 Audit and Logs
- Persist:
  - Call metadata (IDs, timestamps, direction)
  - Transcript
  - Structured screening results
  - Final disposition

## Suggested Call Flow (MVP)
1. Greeting + identify job context.
2. Interest confirmation.
3. Contact capture/verification.
4. 4-6 pre-screen questions.
5. Wrap-up with next-step message.
6. Save record + send summary email.

## Telnyx Integration Requirements (Demo)
- Inbound phone number configured to route to webhook/service.
- Outbound dialer endpoint for candidate call list.
- Real-time call events via webhooks (started, answered, completed).
- Transcript capture and storage.
- Optional recording support.
- Retry/fallback handling for failed outbound attempts.

## Data Model (Minimal)
- `jobs`: id, title, location, pay_range, shift, requirements_json, recruiter_emails
- `candidates`: id, name, phone, email
- `calls`: id, telnyx_call_id, direction, job_id, candidate_id, started_at, ended_at, duration_sec, status
- `screening_answers`: id, call_id, question_key, answer_text, normalized_value, knockout_flag
- `call_summaries`: id, call_id, disposition, summary_text, recruiter_notified_at

## Non-Functional Requirements (Demo-Level)
- Availability target: 24/7 for demo calls.
- Latency: response turn-taking should feel natural (<2.5s target).
- Security:
  - Encrypt secrets and API keys.
  - Basic access control for dashboard.
  - PII visible only in authenticated views.
- Observability:
  - Log webhook failures
  - Track email send failures

## Demo Success Metrics
- >=90% of inbound calls answered automatically.
- >=80% of completed calls produce structured screening output.
- 100% of completed screens trigger recruiter summary.
- Recruiter can view logs and details for every completed call.

## Assumptions
- Single staffing company demo tenant.
- Single language (English).
- Limited set of job postings (3-10 roles).
- Recruiter email is sufficient notification channel for demo.

## Risks and Mitigations
- Speech recognition errors:
  - Mitigation: confirmation prompts for critical fields.
- Candidate drop-off during long calls:
  - Mitigation: keep screening to 4-6 questions.
- Hallucinated or off-policy responses:
  - Mitigation: strict guardrails + canned fallback responses.
- Outbound spam perception:
  - Mitigation: clear identity intro and opt-out language.

## Phased Delivery

### Phase 1: Core Inbound
- Inbound call handling
- Job Q&A + pre-screen
- Data capture + email summary
- Basic dashboard logs

### Phase 2: Outbound + Retry
- Outbound campaign upload
- Call retries + voicemail handling
- Unified inbound/outbound reporting

### Phase 3: Polish (Optional)
- Better recruiter filters/metrics
- Basic role management UI
- Improved summaries and scoring

## Acceptance Criteria (Demo Sign-off)
- Inbound candidate can call a number and complete screening end-to-end.
- Outbound campaign can call at least 20 test candidates with tracked outcomes.
- Recruiter receives summary email within 1 minute of call completion.
- Recruiter can open Next.js dashboard and see logs/transcripts/dispositions.
- At least one role can be configured without code changes.

## Open Questions
- What exact pre-screen questions are mandatory per role?
- Should we record calls in demo by default?
- Which disposition thresholds qualify "pass" vs "fail"?
- Do recruiters need CSV export in v1 demo?

## Appendix: Example Pre-Screen Questions
1. Are you authorized to work in the US?
2. How many years of relevant experience do you have?
3. Are you available for [shift type]?
4. What is your expected hourly pay?
5. Can you start within the next two weeks?

# UI Style
https://www.radix-ui.com/