-- Allow anon to SELECT from staffing tables so API returns rows when the
-- server client uses anon role (e.g. session not forwarded). API still requires auth.

CREATE POLICY "Anon can read staffing_jobs"
  ON staffing.jobs FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read staffing_candidates"
  ON staffing.candidates FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can read staffing_applications"
  ON staffing.applications FOR SELECT TO anon USING (true);
