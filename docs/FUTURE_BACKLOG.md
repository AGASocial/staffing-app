# Future Backlog — Features

Planned features and integrations for the staffing app. Items here are not yet scheduled.

---

## 1. RecruitCRM integration — sync job postings (no manual insertion)

**Goal:** Replace manual job posting creation with sync from RecruitCRM so jobs stay in sync with the ATS and don’t require duplicate data entry.

**Reference:** [RecruitCRM API — Getting Started](https://docs.recruitcrm.io/docs/rcrm-api-reference/ZG9jOjMyNzk0NA-getting-started)

**Scope (high level):**
- Integrate with RecruitCRM API for job/position data.
- Sync job postings from RecruitCRM into the app (create/update jobs from RecruitCRM as source of truth).
- Remove or reduce reliance on manual “insert job” flows for synced jobs.
- Decide sync direction: one-way (RecruitCRM → app) or two-way; document in technical spec.
- Handle auth (API key / OAuth as per RecruitCRM docs), rate limits, and errors (retries, logging, optional dead-letter/queue).
- Optional: scheduled sync (e.g. cron) and/or webhooks if RecruitCRM supports them.

**Notes:**
- Confirm exact RecruitCRM endpoints for jobs/postings (list, get by id) from their API reference.
- Map RecruitCRM job fields to existing app job schema; add migration if new fields are required.
- Consider idempotency (e.g. external_id from RecruitCRM) to avoid duplicates on re-sync.

---

*More backlog items can be added below.*
