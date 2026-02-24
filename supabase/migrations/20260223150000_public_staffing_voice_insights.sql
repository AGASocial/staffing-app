-- Voice insights in public schema (same shape as n8n__lexnet_insights + direction).
CREATE TABLE IF NOT EXISTS public.staffing_voice_insights (
  id bigserial PRIMARY KEY,
  json jsonb,
  summary text,
  assistant_id text,
  insight_id text,
  conversation_id text,
  created_at timestamptz DEFAULT now(),
  direction text
);

ALTER TABLE public.staffing_voice_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read staffing_voice_insights"
  ON public.staffing_voice_insights FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert staffing_voice_insights"
  ON public.staffing_voice_insights FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.staffing_voice_insights TO anon, authenticated;
