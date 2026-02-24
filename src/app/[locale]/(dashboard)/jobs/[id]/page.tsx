"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, UserPlus, Mail, Phone, PhoneCall, ChevronDown, ChevronUp, CheckCircle2, XCircle, MessageSquareQuote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SHIFT_OPTION_KEYS } from "@/constants/shiftOptions";
import type { Job } from "@/models/job";
import type { Candidate } from "@/models/job";
import type { LexnetInsight, OutboundCallJson } from "@/models/insight";
import { parseInsightJson, getDispositionVariant, parseScreeningAnswers, isOutboundCallJson } from "@/models/insight";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function JobDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const jobId = typeof params.id === "string" ? params.id : "";
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [callingCandidateId, setCallingCandidateId] = useState<string | null>(null);
  const [jobInsights, setJobInsights] = useState<LexnetInsight[]>([]);
  const [expandedCallCandidateId, setExpandedCallCandidateId] = useState<string | null>(null);
  const [showAddApplicantModal, setShowAddApplicantModal] = useState(false);

  const digitsOnly = (s: string) => s.replace(/\D/g, "");
  const isPhoneValid = (phone: string) => digitsOnly(phone).length >= 10;

  async function handleStartCall(candidateId: string) {
    if (!jobId) return;
    setCallingCandidateId(candidateId);
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/candidates/${candidateId}/call`,
        { method: "POST", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || t("callError"));
        return;
      }
      alert(t("callStarted"));
    } catch {
      alert(t("callError"));
    } finally {
      setCallingCandidateId(null);
    }
  }

  const fetchJob = useCallback(async () => {
    if (!jobId) return null;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data as Job;
    } catch {
      return null;
    }
  }, [jobId]);

  const fetchCandidates = useCallback(async () => {
    if (!jobId) return [];
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [jobId]);

  const fetchJobInsights = useCallback(async () => {
    if (!jobId) return [];
    try {
      const res = await fetch(`/api/jobs/${jobId}/insights`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchJob(), fetchCandidates(), fetchJobInsights()]).then(([j, c, insights]) => {
      setJob(j ?? null);
      setCandidates(Array.isArray(c) ? c : []);
      setJobInsights(Array.isArray(insights) ? insights : []);
      setLoading(false);
    });
  }, [jobId, fetchJob, fetchCandidates, fetchJobInsights]);

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    if (!isPhoneValid(form.phone)) {
      setPhoneError(t("phoneInvalid"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          source: form.source.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add applicant");
      }
      setForm({ name: "", email: "", phone: "", source: "" });
      setPhoneError(null);
      setShowAddApplicantModal(false);
      const list = await fetchCandidates();
      setCandidates(list);
    } catch (err) {
      console.error(err);
      alert(t("errorAddingCandidate"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!jobId) {
    return (
      <div className="p-4 sm:p-8">
        <p className="text-muted-foreground">{t("noJobs")}</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4">
            <ChevronLeft className="h-4 w-4" />
            {t("jobPostings")}
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 sm:p-8">
        <p className="text-muted-foreground">{t("noJobs")}</p>
        <Link href="/jobs">
          <Button variant="outline" className="mt-4">
            <ChevronLeft className="h-4 w-4" />
            {t("jobPostings")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("jobPostings")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{job.title}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {job.location && <span>{job.location}</span>}
          {job.pay_range && <span>{job.pay_range}</span>}
          {job.shift && (
          <span>
            {(SHIFT_OPTION_KEYS as readonly string[]).includes(job.shift)
              ? t(`shiftOptions.${job.shift}`)
              : job.shift}
          </span>
        )}
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">{t("applicants")}</h2>
          <Button
            onClick={() => {
              setShowAddApplicantModal(true);
              setPhoneError(null);
            }}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("addCandidate")}
          </Button>
        </div>
        {candidates.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/20 py-8 text-center">
            <p className="text-muted-foreground">{t("noCandidates")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("noCandidatesDescription")}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setShowAddApplicantModal(true);
                setPhoneError(null);
              }}
            >
              <UserPlus className="h-4 w-4" />
              {t("addCandidate")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((c) => {
              const latestInsight = jobInsights.find((i) => i.candidate_id === c.id);
              const parsedJson = latestInsight ? parseInsightJson(latestInsight.json) : null;
              const outboundData =
                latestInsight && isOutboundCallJson(parsedJson) ? (parsedJson as OutboundCallJson) : null;
              const screeningPairs = outboundData
                ? parseScreeningAnswers(outboundData.custom_analysis_data?.screening_answers_json)
                : [];
              const hasCallResult = Boolean(latestInsight && outboundData);
              const isExpanded = expandedCallCandidateId === c.id;

              return (
                <div
                  key={c.id}
                  className="glass-card rounded-xl border border-border/50 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {c.email}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {c.phone}
                        </span>
                        {c.source && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {c.source}
                          </span>
                        )}
                      </div>
                    </div>
                    {!hasCallResult && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartCall(c.id)}
                        disabled={!!callingCandidateId || !c.phone?.trim()}
                      >
                        <PhoneCall className="h-4 w-4" />
                        {callingCandidateId === c.id ? t("calling") : t("callCandidate")}
                      </Button>
                    )}
                  </div>

                  {hasCallResult && latestInsight && outboundData && (
                    <div className="border-t border-border/50">
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/20"
                        onClick={() => setExpandedCallCandidateId(isExpanded ? null : c.id)}
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{t("callResult")}</span>
                          {typeof outboundData.call_successful === "boolean" && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                outboundData.call_successful
                                  ? "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30"
                                  : "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500/30"
                              }`}
                            >
                              {outboundData.call_successful ? (
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
                          {(latestInsight.disposition ?? outboundData.disposition) && (() => {
                            const disposition = latestInsight.disposition ?? outboundData.disposition ?? "";
                            const variant = getDispositionVariant(disposition);
                            const variantClasses: Record<string, string> = {
                              success:
                                "border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30",
                              info: "border-blue-500/30 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500/30",
                              warning:
                                "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/30",
                              muted: "border-border bg-muted text-muted-foreground",
                            };
                            const dispositionKey = String(disposition).toUpperCase().replace(/-/g, "_");
                            const label = t(`dispositions.${dispositionKey}`) || disposition;
                            return (
                              <span
                                key="disposition"
                                className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant] ?? variantClasses.muted}`}
                              >
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
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(latestInsight.created_at)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border/50 bg-muted/20 px-4 py-4 space-y-4">
                          <div>
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <MessageSquareQuote className="h-4 w-4" />
                              {t("outboundCallSummary")}
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-foreground">
                              {latestInsight.summary || outboundData.call_summary || "—"}
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showAddApplicantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setShowAddApplicantModal(false)}
        >
          <div
            className="w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold">{t("addCandidate")}</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("name")} *
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder={t("name")}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("email")} *
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder={t("email")}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("phone")} *
                  </label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, phone: e.target.value }));
                      setPhoneError(null);
                    }}
                    placeholder={t("phone")}
                    required
                  />
                  {phoneError && (
                    <p className="mt-1 text-sm text-destructive">{phoneError}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("source")}
                  </label>
                  <Input
                    value={form.source}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, source: e.target.value }))
                    }
                    placeholder={t("sourcePlaceholder")}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => !submitting && setShowAddApplicantModal(false)}
                  disabled={submitting}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "..." : t("addCandidate")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
