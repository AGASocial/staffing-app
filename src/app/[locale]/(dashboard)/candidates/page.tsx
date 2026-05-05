'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserPlus, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PipelineStatusBadge } from '@/components/candidates/PipelineStatusBadge';
import { AddCandidateModal } from '@/components/candidates/AddCandidateModal';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import type { Candidate, CandidatePipelineStatus } from '@/models/candidate';
import { PIPELINE_STATUSES } from '@/models/candidate';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function CandidatesPage() {
  const t = useTranslations();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState<CandidatePipelineStatus | ''>('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (pipelineFilter) params.set('pipeline_status', pipelineFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (!res.ok) {
        setCandidates([]);
        return;
      }
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [pipelineFilter, search]);

  // Debounce search refetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  function handleCandidateCreated(candidate: Candidate) {
    setCandidates((prev) => [candidate, ...prev]);
  }

  function handleCandidateUpdated(updated: Candidate) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  }

  // Pipeline summary counts
  const counts = PIPELINE_STATUSES.reduce(
    (acc, s) => {
      acc[s] = candidates.filter((c) => c.pipeline_status === s).length;
      return acc;
    },
    {} as Record<CandidatePipelineStatus, number>
  );

  return (
    <div className="p-4 sm:p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('candidatesTitle')}
          </h1>
          <p className="mt-1 text-muted-foreground">{t('candidatesDescription')}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          {t('addCandidateTitle')}
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PIPELINE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPipelineFilter(pipelineFilter === s ? '' : s)}
            className={`rounded-xl border p-3 text-left transition-all hover:border-primary/40 ${
              pipelineFilter === s
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                : 'border-border bg-background hover:bg-muted/30'
            }`}
          >
            <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
            <div className="mt-1">
              <PipelineStatusBadge status={s} />
            </div>
          </button>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('candidateSearchPlaceholder')}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value as CandidatePipelineStatus | '')}
            className="h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('allStatuses')}</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`candidatePipelineStatuses.${s}`)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {(pipelineFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setPipelineFilter('');
            }}
          >
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {/* Candidate list */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>{t('loading')}</p>
          </div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">
            {search || pipelineFilter ? t('noCandidatesFound') : t('noCandidatesYet')}
          </h3>
          <p className="max-w-sm text-muted-foreground">
            {search || pipelineFilter ? t('tryAdjustingFilters') : t('noCandidatesYetDescription')}
          </p>
          {!search && !pipelineFilter && (
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('addCandidateTitle')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              onClick={() => setSelectedId(candidate.id)}
              className="group flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-all hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm"
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {candidate.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {candidate.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {candidate.location && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {candidate.location}
                  </span>
                )}
                {candidate.source && (
                  <span className="hidden rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                    {candidate.source}
                  </span>
                )}
                <PipelineStatusBadge status={candidate.pipeline_status} />
                {candidate.resume_file_name && (
                  <span className="hidden rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                    📄 {t('resume')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {formatDate(candidate.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddCandidateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleCandidateCreated}
      />
      <CandidateDetailModal
        candidateId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleCandidateUpdated}
      />
    </div>
  );
}
