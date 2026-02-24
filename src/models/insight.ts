/**
 * Allowed disposition values from Lexnet prescreen.
 * - CALLBACK_REQUESTED: caller asks for human recruiter / callback
 * - FAILED_KNOCKOUT: any knockout answer has passed=false
 * - INCOMPLETE: caller hung up early OR candidate contact missing OR most prescreen answers missing
 * - PASSED_PRESCREEN: default when none of the above
 */
export const LEXNET_DISPOSITION = [
  "CALLBACK_REQUESTED",
  "FAILED_KNOCKOUT",
  "INCOMPLETE",
  "PASSED_PRESCREEN",
] as const;

export type LexnetDisposition = (typeof LEXNET_DISPOSITION)[number];

/**
 * Parsed shape of n8n__lexnet_insights.json for display.
 * disposition is shown in the list for quick staffing review.
 */
export interface LexnetInsightJson {
  disposition?: string;
  interest_confirmed?: boolean;
  [key: string]: unknown;
}

/**
 * Row from public.n8n__lexnet_insights
 */
export type InsightDirection = 'inbound' | 'outbound';

export interface LexnetInsight {
  id: number;
  json: LexnetInsightJson | string | null;
  summary: string | null;
  assistant_id: string | null;
  insight_id: string | null;
  conversation_id: string | null;
  created_at: string | null;
  direction?: InsightDirection | string | null;
  disposition?: string | null;
  job_id?: string | null;
  candidate_id?: string | null;
  call_id?: string | null;
}

/** Outbound call analysis shape (stored in json). */
export type OutboundCallJson = LexnetInsightJson & {
  call_summary?: string | null;
  in_voicemail?: boolean;
  user_sentiment?: string | null;
  disposition?: string;
  call_successful?: boolean;
  custom_analysis_data?: {
    screening_answers_json?: string | null;
  } | null;
};

export function parseScreeningAnswers(
  raw: string | null | undefined
): Array<{ question: string; response: string }> {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { question?: string; response?: string } => item != null && typeof item === "object")
      .map((item) => ({
        question: typeof item.question === "string" ? item.question : "",
        response: typeof item.response === "string" ? item.response : "",
      }))
      .filter((p) => p.question || p.response);
  } catch {
    return [];
  }
}

export function isOutboundCallJson(json: LexnetInsightJson | null): json is OutboundCallJson {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  return "call_summary" in o || "call_successful" in o || "custom_analysis_data" in o;
}

/**
 * Normalize insight json: parse if string, return object or null.
 * Supabase/API may return the json column as a string.
 */
export function parseInsightJson(
  json: LexnetInsightJson | string | null
): LexnetInsightJson | null {
  if (json === null || json === undefined) return null;
  if (typeof json === "object" && json !== null && !Array.isArray(json))
    return json as LexnetInsightJson;
  if (typeof json === "string") {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))
        return parsed as LexnetInsightJson;
    } catch {
      // ignore
    }
  }
  return null;
}

/** Safe getter for disposition from insight json (string or nested). */
export function getInsightDisposition(json: LexnetInsightJson | null): string | null {
  if (!json || typeof json !== "object") return null;
  const d = json.disposition;
  if (typeof d === "string") return d;
  if (d != null && typeof d === "object" && "value" in (d as Record<string, unknown>))
    return String((d as { value?: unknown }).value);
  return d != null ? String(d) : null;
}

/** Safe getter for interest_confirmed from insight json. Returns null if missing. */
export function getInterestConfirmed(json: LexnetInsightJson | null): boolean | null {
  if (!json || typeof json !== "object") return null;
  const v = json.interest_confirmed;
  if (typeof v === "boolean") return v;
  if (typeof v === "object" && v != null && "value" in (v as Record<string, unknown>))
    return Boolean((v as { value?: unknown }).value);
  return null;
}

/** Badge style for staffing: success (green), warning (amber), info (blue), muted (gray). */
export type DispositionVariant = "success" | "warning" | "info" | "muted";

export function getDispositionVariant(disposition: string | null): DispositionVariant {
  if (!disposition) return "muted";
  switch (disposition.toUpperCase()) {
    case "PASSED_PRESCREEN":
      return "success";
    case "CALLBACK_REQUESTED":
      return "info";
    case "FAILED_KNOCKOUT":
      return "warning";
    case "INCOMPLETE":
      return "muted";
    default:
      return "muted";
  }
}
