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

/** Inbound call analysis shape (stored in json). */
export type InboundCallJson = LexnetInsightJson & {
  call_summary?: string | null;
  in_voicemail?: boolean;
  user_sentiment?: string | null;
  call_successful?: boolean;
  custom_analysis_data?: {
    Client_Name?: unknown;
    Client_phone?: unknown;
    Appointment_Date?: unknown;
    Appointment_Time?: unknown;
    Reason_Call?: unknown;
    client_email?: unknown;
    [key: string]: unknown;
  } | null;
};

export interface InboundAppointmentInfo {
  iso: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  dateTimeLabel: string | null;
}

export interface ParsedInboundInsight {
  callSummary: string | null;
  callSuccessful: boolean | null;
  inVoicemail: boolean;
  userSentiment: string | null;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  reasonForCall: string | null;
  appointment: InboundAppointmentInfo;
}

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

export function isInboundCallJson(json: LexnetInsightJson | null): json is InboundCallJson {
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

function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function parseAppointmentTime(
  raw: unknown
): { hour: number; minute: number; label: string } | null {
  const text = normalizeText(raw);
  if (!text) return null;
  const digits = text.replace(/\D/g, "");
  if (!digits || digits.length > 4) return null;

  const padded = digits.padStart(4, "0");
  const hour = Number.parseInt(padded.slice(0, 2), 10);
  const minute = Number.parseInt(padded.slice(2, 4), 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const time = new Date(2026, 0, 1, hour, minute);
  return {
    hour,
    minute,
    label: time.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function parseAppointmentDateFromSummary(summary: string | null): {
  year: number;
  monthIndex: number;
  day: number;
} | null {
  if (!summary) return null;

  const match = summary.match(
    /\b(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\b/i
  );

  if (!match) return null;

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthIndex = monthNames.indexOf(match[1].toLowerCase());
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (monthIndex < 0 || Number.isNaN(day) || Number.isNaN(year)) return null;

  return { year, monthIndex, day };
}

function buildAppointmentInfo(
  summary: string | null,
  rawTime: unknown
): InboundAppointmentInfo {
  const dateParts = parseAppointmentDateFromSummary(summary);
  const time = parseAppointmentTime(rawTime);

  if (!dateParts) {
    return {
      iso: null,
      dateLabel: null,
      timeLabel: time?.label ?? null,
      dateTimeLabel: time?.label ?? null,
    };
  }

  const appointment = new Date(
    dateParts.year,
    dateParts.monthIndex,
    dateParts.day,
    time?.hour ?? 0,
    time?.minute ?? 0,
    0,
    0
  );

  const hasTime = Boolean(time);

  return {
    iso: appointment.toISOString(),
    dateLabel: appointment.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    timeLabel: time?.label ?? null,
    dateTimeLabel: appointment.toLocaleString(undefined, {
      dateStyle: "medium",
      ...(hasTime ? { timeStyle: "short" as const } : {}),
    }),
  };
}

function normalizePhoneNumber(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return text;
}

export function parseInboundInsight(
  json: LexnetInsightJson | null,
  summaryFallback?: string | null
): ParsedInboundInsight {
  const inboundJson = isInboundCallJson(json) ? json : null;
  const callSummary =
    normalizeText(inboundJson?.call_summary) ?? normalizeText(summaryFallback) ?? null;
  const custom = inboundJson?.custom_analysis_data ?? null;

  return {
    callSummary,
    callSuccessful:
      typeof inboundJson?.call_successful === "boolean"
        ? inboundJson.call_successful
        : null,
    inVoicemail: Boolean(inboundJson?.in_voicemail),
    userSentiment: normalizeText(inboundJson?.user_sentiment),
    clientName: normalizeText(custom?.Client_Name),
    clientPhone: normalizePhoneNumber(custom?.Client_phone),
    clientEmail: normalizeText(custom?.client_email),
    reasonForCall: normalizeText(custom?.Reason_Call),
    appointment: buildAppointmentInfo(callSummary, custom?.Appointment_Time),
  };
}
