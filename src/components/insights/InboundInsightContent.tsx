"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareQuote,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import type { LexnetInsight, LexnetInsightJson } from "@/models/insight";
import { parseInboundInsight } from "@/models/insight";

function renderJsonValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.length === 0 ? "[]" : `${value.length} item(s)`;
  if (typeof value === "object") {
    return Object.keys(value as object).length ? (
      <pre className="ml-2 rounded bg-muted/30 px-2 py-1 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    ) : "{}";
  }
  return String(value);
}

function InsightJsonDetails({ json }: { json: LexnetInsightJson }) {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return null;
  const entries = Object.entries(json).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return null;

  return (
    <dl className="grid gap-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <dt className="font-medium capitalize text-muted-foreground">{key}</dt>
          <dd className="text-foreground">{renderJsonValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | null;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function InboundInsightPreview({
  row,
  parsedJson,
  interestConfirmed,
  dispositionLabel,
  dispositionBadgeClassName,
}: {
  row: LexnetInsight;
  parsedJson: LexnetInsightJson | null;
  interestConfirmed: boolean | null;
  dispositionLabel: string | null;
  dispositionBadgeClassName: string;
}) {
  const t = useTranslations();
  const inbound = parseInboundInsight(parsedJson, row.summary);
  const title = inbound.clientName || t("inboundCandidateCall");
  const previewText = inbound.reasonForCall || inbound.callSummary || row.summary || "—";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {inbound.appointment.dateTimeLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {inbound.appointment.dateTimeLabel}
          </span>
        )}
        {typeof inbound.callSuccessful === "boolean" && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              inbound.callSuccessful
                ? "border-green-500/30 bg-green-100 text-green-800 dark:border-green-500/30 dark:bg-green-900/30 dark:text-green-300"
                : "border-red-500/30 bg-red-100 text-red-800 dark:border-red-500/30 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {inbound.callSuccessful ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("callSuccessful")}
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" /> {t("callUnsuccessful")}
              </>
            )}
          </span>
        )}
        {dispositionLabel && (
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${dispositionBadgeClassName}`}>
            {t("disposition")}: {dispositionLabel}
          </span>
        )}
        {interestConfirmed !== null && (
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              interestConfirmed
                ? "border-green-500/30 bg-green-100 text-green-800 dark:border-green-500/30 dark:bg-green-900/30 dark:text-green-300"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {t("interestConfirmed")}: {interestConfirmed ? t("yes") : t("no")}
          </span>
        )}
        {inbound.userSentiment && (
          <span
            className={
              inbound.userSentiment.toLowerCase() === "positive"
                ? "rounded-full border border-green-500/30 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:border-green-500/30 dark:bg-green-900/30 dark:text-green-300"
                : "rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            }
          >
            {t("sentiment")}: {inbound.userSentiment}
          </span>
        )}
        {inbound.inVoicemail && (
          <span className="rounded-full border border-amber-500/30 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {t("voicemail")}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {inbound.clientPhone && (
            <span className="text-xs text-muted-foreground">{inbound.clientPhone}</span>
          )}
          {inbound.clientEmail && (
            <span className="text-xs text-muted-foreground">{inbound.clientEmail}</span>
          )}
        </div>
        <p className="line-clamp-2 text-sm text-foreground/90">{previewText}</p>
      </div>
    </>
  );
}

export function InboundInsightExpanded({
  row,
  parsedJson,
}: {
  row: LexnetInsight;
  parsedJson: LexnetInsightJson | null;
}) {
  const t = useTranslations();
  const inbound = parseInboundInsight(parsedJson, row.summary);
  const hasStructuredDetails = Boolean(
    inbound.clientName ||
      inbound.clientPhone ||
      inbound.clientEmail ||
      inbound.reasonForCall ||
      inbound.appointment.dateLabel ||
      inbound.appointment.timeLabel
  );

  return (
    <div className="space-y-4">
      {(inbound.appointment.dateLabel || inbound.appointment.timeLabel) && (
        <div className="overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,rgba(59,130,246,0.10),rgba(16,185,129,0.08),rgba(255,255,255,0.92))] p-5 dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(16,185,129,0.12),rgba(15,23,42,0.8))]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
            {t("scheduledInterview")}
          </p>
          {inbound.appointment.dateLabel && (
            <p className="text-xl font-semibold text-foreground">
              {inbound.appointment.dateLabel}
            </p>
          )}
          {inbound.appointment.timeLabel && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
              <Clock3 className="h-4 w-4 text-primary" />
              {inbound.appointment.timeLabel}
            </div>
          )}
        </div>
      )}

      {hasStructuredDetails && (
        <div className="grid gap-3 md:grid-cols-2">
          <DetailCard icon={UserRound} label={t("candidateName")} value={inbound.clientName} />
          <DetailCard icon={Phone} label={t("candidatePhone")} value={inbound.clientPhone} />
          <DetailCard icon={Mail} label={t("candidateEmail")} value={inbound.clientEmail} />
          <DetailCard icon={CalendarDays} label={t("appointmentDate")} value={inbound.appointment.dateLabel} />
          <DetailCard icon={Clock3} label={t("appointmentTime")} value={inbound.appointment.timeLabel} />
          <DetailCard icon={MessageSquareQuote} label={t("callReason")} value={inbound.reasonForCall} />
        </div>
      )}

      {inbound.callSummary && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageSquareQuote className="h-4 w-4" />
            {t("callSummaryLabel")}
          </p>
          <p className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-foreground shadow-sm">
            {inbound.callSummary}
          </p>
        </div>
      )}

      {!hasStructuredDetails && parsedJson && Object.keys(parsedJson).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {t("insightDetails")}
          </p>
          <InsightJsonDetails json={parsedJson} />
        </div>
      )}
    </div>
  );
}
