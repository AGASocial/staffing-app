'use client';

import { useTranslations } from 'next-intl';
import type { CandidatePipelineStatus } from '@/models/candidate';

const STATUS_STYLES: Record<CandidatePipelineStatus, string> = {
  applied:
    'border-blue-500/30 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500/30',
  screened:
    'border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-500/30',
  interviewed:
    'border-purple-500/30 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-500/30',
  placed:
    'border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500/30',
  inactive:
    'border-border bg-muted text-muted-foreground',
};

interface PipelineStatusBadgeProps {
  status: CandidatePipelineStatus | string;
  className?: string;
}

export function PipelineStatusBadge({ status, className = '' }: PipelineStatusBadgeProps) {
  const t = useTranslations();
  const key = status as CandidatePipelineStatus;
  const styles = STATUS_STYLES[key] ?? STATUS_STYLES.inactive;
  const label = t(`candidatePipelineStatuses.${key}`) ?? status;

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
