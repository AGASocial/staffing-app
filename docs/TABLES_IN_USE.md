# Tables in use

## Summary

| Schema   | Tables | Purpose |
|----------|--------|--------|
| **public** | `users` | Auth/profile (keep here; Supabase Auth ties to public.users) |
| **public** | `security_otps` | PIN reset / security flows |
| **public** | `n8n__lexnet_insights` | Call insights from n8n/Lexnet (external) |
| **public** | `staffing_jobs`, `staffing_candidates`, `staffing_applications` | Total Talent Resources – job postings, candidate pool, applications |
| **public** | (rest below) | From the original iablee/digital-assets app – optional for staffing demo |

---

## public (staffing + auth)

- **users** – Auth, profile, security PIN.
- **security_otps** – One-time codes for PIN reset.
- **n8n__lexnet_insights** – Insights/voice call records (direction, disposition, etc.).
- **staffing_jobs** – Job postings (title, location, pay, shift, status, etc.).
- **staffing_candidates** – Candidate pool (name, email, phone, source, status). One row per person; can apply to many jobs.
- **staffing_applications** – Links candidate to job (job_id, candidate_id, status). One row per “person X applied to job Y”.

---

## public tables used by other app features (not required for staffing demo)

- beneficiaries, digital_assets, asset_attachments, assets, relationships, asset_types, asset_type_billing_plans, decrypted_digital_assets  
- billing_plans, billing_subscriptions, billing_payment_methods, billing_invoices, billing_webhook_events  

If this project is **only** the staffing demo, you can ignore or drop these. If you share the codebase with the legacy app, leave them in public.
