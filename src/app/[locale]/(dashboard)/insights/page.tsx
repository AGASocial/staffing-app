"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Lightbulb, ChevronDown, ChevronUp, MessageSquareQuote, CheckCircle2, XCircle } from "lucide-react";
import { useSecurity } from "@/context/SecurityContext";
import { FilterBar } from "@/components/FilterBar";
import { InboundInsightExpanded, InboundInsightPreview } from "@/components/insights/InboundInsightContent";
import type { LexnetInsight, OutboundCallJson } from "@/models/insight";
import { getInsightDisposition, getDispositionVariant, getInterestConfirmed, parseInsightJson, parseScreeningAnswers, isOutboundCallJson } from "@/models/insight";

type DirectionTab = "inbound" | "outbound";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function InsightsPage() {
  const t = useTranslations();
  const { locked, loading: securityLoading } = useSecurity();
  const [insights, setInsights] = useState<LexnetInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [directionTab, setDirectionTab] = useState<DirectionTab>("outbound");

  const filteredInsights = insights
    .filter((row) => {
      const dir = row.direction?.toLowerCase();
      if (dir !== "inbound" && dir !== "outbound") return false;
      return dir === directionTab;
    })
    .filter((row) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const disposition = getInsightDisposition(parseInsightJson(row.json));
      return (
        (row.summary?.toLowerCase().includes(q)) ||
        (row.insight_id?.toLowerCase().includes(q)) ||
        (row.conversation_id?.toLowerCase().includes(q)) ||
        (row.assistant_id?.toLowerCase().includes(q)) ||
        (disposition?.toLowerCase().includes(q))
      );
    });

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch("/api/insights");
      if (!res.ok) {
        setInsights([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInsights(Array.isArray(data) ? data : []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locked || securityLoading) return;
    const timeoutId = window.setTimeout(() => {
      void fetchInsights();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchInsights, locked, securityLoading]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {t("insightsTitle")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("insightsDescription")}
        </p>
      </div>

      <FilterBar
        onSearch={setSearchQuery}
        onFilterChange={(key, value) =>
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }
        onClearFilters={() => {
          setSearchQuery("");
          setActiveFilters({});
        }}
        filters={[]}
        activeFilters={activeFilters}
        searchQuery={searchQuery}
        placeholder={t("searchInsights")}
      />

      <div className="mt-4 flex rounded-lg border border-border bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setDirectionTab("inbound")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            directionTab === "inbound"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("directionInbound")}
        </button>
        <button
          type="button"
          onClick={() => setDirectionTab("outbound")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            directionTab === "outbound"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("directionOutbound")}
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p>{t("loading")}</p>
            </div>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted py-16 text-center glass-panel">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">{t("noInsights")}</h3>
            <p className="max-w-sm text-muted-foreground">
              {searchQuery
                ? t("tryAdjustingFilters")
                : t("noInsightsForDirection")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map((row, index) => {
              const parsedJson = parseInsightJson(row.json);
              const isOutbound = row.direction?.toLowerCase() === "outbound";
              const outboundData = isOutbound && isOutboundCallJson(parsedJson) ? (parsedJson as OutboundCallJson) : null;
              const screeningPairs = outboundData
                ? parseScreeningAnswers(outboundData.custom_analysis_data?.screening_answers_json)
                : [];
              const disposition = row.disposition ?? getInsightDisposition(parsedJson);
              const interestConfirmed = getInterestConfirmed(parsedJson);
              const dispositionLabel = disposition
                ? t(`dispositions.${String(disposition).toUpperCase().replace(/-/g, "_")}`) || disposition
                : null;
              const variantClasses: Record<string, string> = {
                success: "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30",
                info: "border-blue-500/30 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500/30",
                warning: "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/30",
                muted: "border-border bg-muted text-muted-foreground",
              };
              const dispositionBadgeClassName = disposition
                ? variantClasses[getDispositionVariant(disposition)] ?? variantClasses.muted
                : variantClasses.muted;

              return (
              <div
                key={row.id}
                className={`glass-card animate-fade-in-up rounded-2xl border border-border/50 overflow-hidden transition-all hover:border-primary/20 ${
                  index < 10 ? `delay-${Math.min(index + 1, 10) * 100}` : ""
                }`}
              >
                <div
                  className="flex cursor-pointer flex-wrap items-start justify-between gap-3 p-4"
                  onClick={() =>
                    setExpandedId(expandedId === row.id ? null : row.id)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setExpandedId(expandedId === row.id ? null : row.id);
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {outboundData ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            <PhoneOutgoing className="h-3.5 w-3.5" />
                            {t("directionOutbound")}
                          </span> */}
                          {typeof outboundData.call_successful === "boolean" && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                outboundData.call_successful
                                  ? "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30"
                                  : "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500/30"
                              }`}
                            >
                              {outboundData.call_successful ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> {t("callSuccessful")}</>
                              ) : (
                                <><XCircle className="h-3.5 w-3.5" /> {t("callUnsuccessful")}</>
                              )}
                            </span>
                          )}
                          {(row.disposition ?? outboundData.disposition) && (() => {
                            const disposition = row.disposition ?? outboundData.disposition ?? "";
                            const variant = getDispositionVariant(disposition);
                            const variantClasses: Record<string, string> = {
                              success: "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30",
                              info: "border-blue-500/30 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500/30",
                              warning: "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/30",
                              muted: "border-border bg-muted text-muted-foreground",
                            };
                            const dispositionKey = String(disposition).toUpperCase().replace(/-/g, "_");
                            const label = t(`dispositions.${dispositionKey}`) || disposition;
                            return (
                              <span key="disposition" className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant] ?? variantClasses.muted}`}>
                                {t("disposition")}: {label}
                              </span>
                            );
                          })()}
                          {outboundData.user_sentiment && (
                            <span
                              className={
                                String(outboundData.user_sentiment).toLowerCase() === "positive"
                                  ? "rounded-full border border-green-500/30 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30"
                                  : "rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                              }
                            >
                              {t("sentiment")}: {String(outboundData.user_sentiment)}
                            </span>
                          )}
                          {outboundData.in_voicemail && (
                            <span className="rounded-full border border-amber-500/30 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              {t("voicemail")}
                            </span>
                          )}
                        </div>
                        {(row.summary || outboundData.call_summary) && (
                          <p className="line-clamp-2 font-medium text-foreground">
                            {row.summary || outboundData.call_summary || ""}
                          </p>
                        )}
                        {screeningPairs.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t("screeningAnswers")}: {screeningPairs.length} {t("question").toLowerCase()}(s)
                          </p>
                        )}
                      </>
                    ) : (
                      <InboundInsightPreview
                        row={row}
                        parsedJson={parsedJson}
                        interestConfirmed={interestConfirmed}
                        dispositionLabel={dispositionLabel}
                        dispositionBadgeClassName={dispositionBadgeClassName}
                      />
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {row.insight_id && (
                        <span title={row.insight_id}>
                          {t("insightId")}: {row.insight_id.slice(0, 12)}…
                        </span>
                      )}
                      {row.conversation_id && (
                        <span title={row.conversation_id}>
                          {t("conversationId")}:{" "}
                          {row.conversation_id.slice(0, 12)}…
                        </span>
                      )}
                      <span>{t("createdAt")}: {formatDate(row.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.assistant_id && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {row.assistant_id.slice(0, 8)}…
                      </span>
                    )}
                    {expandedId === row.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {expandedId === row.id && (
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-4 space-y-4">
                    {outboundData ? (
                      <>
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <MessageSquareQuote className="h-4 w-4" />
                            {t("outboundCallSummary")}
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-foreground">
                            {row.summary || outboundData.call_summary || "—"}
                          </p>
                        </div>
                        {screeningPairs.length > 0 && (
                          <div>
                            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("screeningAnswers")}
                            </p>
                            <div className="space-y-3">
                              {screeningPairs.map((pair, i) => (
                                <div
                                  key={i}
                                  className="rounded-xl border border-border/50 bg-background p-3 shadow-sm"
                                >
                                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                    {t("question")} {i + 1}
                                  </p>
                                  <p className="mb-2 text-sm font-medium text-foreground">
                                    {pair.question}
                                  </p>
                                  <p className="text-xs font-semibold text-muted-foreground">
                                    {t("response")}
                                  </p>
                                  <p className="mt-0.5 text-sm text-foreground">
                                    {pair.response || "—"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <InboundInsightExpanded row={row} parsedJson={parsedJson} />
                    )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
