"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Briefcase, Plus, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIFT_OPTION_KEYS } from "@/constants/shiftOptions";
import type { Job } from "@/models/job";

export default function JobsPage() {
  const t = useTranslations();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    pay_range: "",
    shift: "",
    interview_questions: "",
  });
  const [jobUrl, setJobUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          console.warn("Jobs fetch: Unauthorized – session may be missing or expired");
        }
        setJobs([]);
        return;
      }
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleExtractFromUrl() {
    const url = jobUrl.trim();
    if (!url) return;
    setExtractError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/jobs/extract-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExtractError(data?.error || t("extractError"));
        return;
      }
      const questions = Array.isArray(data.requirements_json?.interview_questions)
        ? data.requirements_json.interview_questions.join("\n")
        : "";
      setForm((f) => ({
        ...f,
        title: data.title ?? f.title,
        description: data.description ?? f.description,
        location: data.location ?? f.location,
        pay_range: data.pay_range ?? f.pay_range,
        shift: data.shift ?? f.shift ?? "1st_shift",
        interview_questions: questions || f.interview_questions,
      }));
      setJobUrl("");
    } catch {
      setExtractError(t("extractError"));
    } finally {
      setExtracting(false);
    }
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const interviewLines = form.interview_questions
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);
      const requirements_json =
        interviewLines.length > 0
          ? { interview_questions: interviewLines }
          : null;
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          pay_range: form.pay_range.trim() || null,
          shift: form.shift.trim() || "1st_shift",
          requirements_json,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create job");
      }
      setShowAddModal(false);
      setForm({
        title: "",
        description: "",
        location: "",
        pay_range: "",
        shift: "",
        interview_questions: "",
      });
      setJobUrl("");
      setExtractError(null);
      fetchJobs();
    } catch (err) {
      console.error(err);
      alert(t("errorCreatingJob"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t("jobPostings")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("jobsDescription")}</p>
        </div>
        <Button
          onClick={() => {
            setShowAddModal(true);
            setJobUrl("");
            setExtractError(null);
          }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          {t("addJob")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted py-16 text-center glass-panel">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">{t("noJobs")}</h3>
          <p className="mb-6 max-w-sm text-muted-foreground">
            {t("noJobsDescription")}
          </p>
          <Button
            onClick={() => {
              setShowAddModal(true);
              setJobUrl("");
              setExtractError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("addJob")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-4 transition-all hover:border-primary/20 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
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
                <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t("viewApplicants")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setShowAddModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold">{t("createJob")}</h2>

            <div className="mb-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
              <label className="mb-1 block text-sm font-medium">
                {t("pasteJobUrl")}
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => {
                    setJobUrl(e.target.value);
                    setExtractError(null);
                  }}
                  placeholder={t("pasteJobUrlPlaceholder")}
                  className="flex-1"
                  disabled={extracting}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleExtractFromUrl}
                  disabled={extracting || !jobUrl.trim()}
                >
                  {extracting ? t("extracting") : t("extractFromUrl")}
                </Button>
              </div>
              {extractError && (
                <p className="mt-2 text-sm text-destructive">{extractError}</p>
              )}
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("jobTitle")} *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder={t("jobTitle")}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("description")}
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder={t("descriptionPlaceholder")}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("location")}
                </label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder={t("location")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("payRange")}
                </label>
                <Input
                  value={form.pay_range}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pay_range: e.target.value }))
                  }
                  placeholder={t("payRange")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("shift")}
                </label>
                <Select
                  value={form.shift || undefined}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, shift: value ?? "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("shiftPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_OPTION_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`shiftOptions.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("interviewQuestions")}
                </label>
                <Textarea
                  value={form.interview_questions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      interview_questions: e.target.value,
                    }))
                  }
                  placeholder={t("interviewQuestionsPlaceholder")}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => !submitting && setShowAddModal(false)}
                  disabled={submitting}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "..." : t("createJob")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
