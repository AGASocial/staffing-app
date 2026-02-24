-- RLS for n8n__lexnet_insights: allow authenticated users to read.
-- Table is assumed to exist (e.g. created by n8n). If you need user-scoping, add a user_id column and change the policy.

ALTER TABLE IF EXISTS public.n8n__lexnet_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read n8n__lexnet_insights"
ON public.n8n__lexnet_insights
FOR SELECT
TO authenticated
USING (true);
