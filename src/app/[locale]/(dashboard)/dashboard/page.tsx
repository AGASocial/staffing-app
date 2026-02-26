"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Users,
  PhoneOutgoing,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Job } from "@/models/job";

type DashboardStats = {
  totalJobs: number;
  totalApplicants: number;
  totalCalls: number;
  callsThisWeek: number;
};

type RecentCall = {
  id: number;
  job_id: string;
  summary: string | null;
  created_at: string | null;
  disposition: string | null;
  call_status: string | null;
};

export default function DashboardPage() {
  const t = useTranslations();
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    totalApplicants: 0,
    totalCalls: 0,
    callsThisWeek: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const res = await fetch("/api/dashboard", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setStats(
          data.stats ?? {
            totalJobs: 0,
            totalApplicants: 0,
            totalCalls: 0,
            callsThisWeek: 0,
          }
        );
        setRecentJobs(data.recentJobs ?? []);
        setRecentCalls(data.recentCalls ?? []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  function formatCallDate(value: string | null): string {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  }

  function getJobTitle(jobId: string): string {
    const job = recentJobs.find((j) => j.id === jobId);
    return job?.title ?? jobId;
  }

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("dashboard")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboardOverviewStaffing")}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel hover-lift border-border/50 animate-fade-in-up delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {t("totalJobs")}
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {loading ? "—" : stats.totalJobs}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {t("openPositions")}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-lift border-border/50 animate-fade-in-up delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {t("totalApplicants")}
            </CardTitle>
            <div className="p-2.5 rounded-xl icon-bg-accent shadow-inner">
              <Users className="h-4 w-4 icon-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {loading ? "—" : stats.totalApplicants}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {t("applicantsAcrossJobs")}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-lift border-border/50 animate-fade-in-up delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {t("totalCalls")}
            </CardTitle>
            <div className="p-2.5 rounded-xl icon-bg-success shadow-inner">
              <PhoneOutgoing className="h-4 w-4 icon-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {loading ? "—" : stats.totalCalls}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {t("callsMade")}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-lift border-border/50 animate-fade-in-up delay-[400ms]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {t("callsThisWeek")}
            </CardTitle>
            <div className="p-2.5 rounded-xl icon-bg-info shadow-inner">
              <Activity className="h-4 w-4 icon-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {loading ? "—" : stats.callsThisWeek}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {t("screeningCallsLast7Days")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 animate-fade-in-up delay-[500ms]">
        {/* Recent Job Postings */}
        <Card className="col-span-1 glass-card border-none shadow-xl bg-card/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-xl">
                {t("recentJobPostings")}
              </CardTitle>
              <CardDescription className="text-base">
                {t("jobPostings")}
              </CardDescription>
            </div>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="gap-1">
                {t("viewAllJobs")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-center text-sm text-muted-foreground mb-4 max-w-[250px]">
                  {t("noJobsYet")}
                </p>
                <Link href="/jobs">
                  <Button>{t("addJob")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="group flex items-center justify-between p-4 border border-transparent rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] hover:border-primary/10 hover:shadow-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {job.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {job.location ?? "—"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card className="col-span-1 glass-card border-none shadow-xl bg-card/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-xl">{t("recentCalls")}</CardTitle>
              <CardDescription className="text-base">
                {t("callsMade")}
              </CardDescription>
            </div>
            <Link href="/insights">
              <Button variant="ghost" size="sm" className="gap-1">
                {t("viewInsights")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <PhoneOutgoing className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-center text-sm text-muted-foreground max-w-[250px]">
                  {t("noCallsYetDescription")}
                </p>
                <Link href="/jobs">
                  <Button variant="outline">{t("jobPostings")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex flex-col gap-1 p-4 border border-transparent rounded-xl bg-white/5 hover:bg-white/10 transition-all border-border/30"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {getJobTitle(call.job_id)} · {formatCallDate(call.created_at)}
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">
                      {call.summary || call.disposition || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
