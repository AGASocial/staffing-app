'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Phone, Mail, MapPin, Calendar, Briefcase, MessageSquare, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PipelineStatusBadge } from './PipelineStatusBadge';
import { ResumeUpload } from './ResumeUpload';
import type { Candidate, CandidatePipelineStatus } from '@/models/candidate';
import { PIPELINE_STATUSES } from '@/models/candidate';
import { getDispositionVariant } from '@/models/insight';

interface CandidateDetailModalProps {
  candidateId: string | null;
  onClose: () => void;
  onUpdated: (candidate: Candidate) => void;
}

interface CandidateDetail extends Candidate {
  insights: Array<{
    id: number;
    summary: string | null;
    disposition: string | null;
    created_at: string | null;
    call_id: string | null;
  }>;
  applications: Array<{
    id: string;
    status: string;
    applied_at: string | null;
    job: { id: string; title: string; client_name: string | null; location: string | null } | null;
  }>;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function CandidateDetailModal({ candidateId, onClose, onUpdated }: CandidateDetailModalProps) {
  const t = useTranslations();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    location: '',
    availability: '',
    skills: '',
    notes: '',
    pipeline_status: 'applied' as CandidatePipelineStatus,
  });

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`);
      if (!res.ok) return;
      const data: CandidateDetail = await res.json();
      setCandidate(data);
      setForm({
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source ?? '',
        location: data.location ?? '',
        availability: data.availability ?? '',
        skills: data.skills ?? '',
        notes: data.notes ?? '',
        pipeline_status: (data.pipeline_status as CandidatePipelineStatus) ?? 'applied',
      });
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    if (!candidate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          source: form.source || null,
          location: form.location || null,
          availability: form.availability || null,
          skills: form.skills || null,
          notes: form.notes || null,
          pipeline_status: form.pipeline_status,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('errorUpdatingCandidate'));
        return;
      }
      const updated: Candidate = await res.json();
      setCandidate((prev) => prev ? { ...prev, ...updated } : null);
      onUpdated(updated);
      setEditing(false);
    } catch {
      setError(t('errorUpdatingCandidate'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: CandidatePipelineStatus) {
    if (!candidate) return;
    const res = await fetch(`/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_status: newStatus }),
    });
    if (res.ok) {
      const updated: Candidate = await res.json();
      setCandidate((prev) => prev ? { ...prev, ...updated } : null);
      setForm((prev) => ({ ...prev, pipeline_status: newStatus }));
      onUpdated(updated);
    }
  }

  if (!candidateId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {candidate?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{candidate?.name ?? '…'}</h2>
              {candidate && (
                <PipelineStatusBadge status={candidate.pipeline_status} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t('edit')}
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : candidate ? (
            <>
              {/* Pipeline status quick-change */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('candidatePipelineLabel')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PIPELINE_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusChange(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        candidate.pipeline_status === s
                          ? 'ring-2 ring-primary ring-offset-1'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <PipelineStatusBadge status={s} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Core info */}
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name">{t('name')}</Label>
                    <Input id="edit-name" name="name" value={form.name} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-email">{t('email')}</Label>
                      <Input id="edit-email" name="email" type="email" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone">{t('phone')}</Label>
                      <Input id="edit-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-location">{t('location')}</Label>
                      <Input id="edit-location" name="location" value={form.location} onChange={handleChange} placeholder="City, State" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-availability">{t('candidateAvailability')}</Label>
                      <Input id="edit-availability" name="availability" value={form.availability} onChange={handleChange} placeholder="Immediately" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-skills">{t('candidateSkills')}</Label>
                    <Input id="edit-skills" name="skills" value={form.skills} onChange={handleChange} placeholder="Forklift, CDL…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-source">{t('source')}</Label>
                    <Input id="edit-source" name="source" value={form.source} onChange={handleChange} placeholder="LinkedIn, Indeed…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-notes">{t('notes')}</Label>
                    <textarea
                      id="edit-notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>{t('cancel')}</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? t('saving') : t('save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoRow icon={<Mail className="h-4 w-4" />} label={t('email')} value={candidate.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label={t('phone')} value={candidate.phone} />
                  {candidate.location && (
                    <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('location')} value={candidate.location} />
                  )}
                  {candidate.availability && (
                    <InfoRow icon={<Calendar className="h-4 w-4" />} label={t('candidateAvailability')} value={candidate.availability} />
                  )}
                  {candidate.source && (
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label={t('source')} value={candidate.source} />
                  )}
                  {candidate.skills && (
                    <div className="sm:col-span-2">
                      <InfoRow icon={<Briefcase className="h-4 w-4" />} label={t('candidateSkills')} value={candidate.skills} />
                    </div>
                  )}
                  {candidate.notes && (
                    <div className="sm:col-span-2">
                      <InfoRow icon={<MessageSquare className="h-4 w-4" />} label={t('notes')} value={candidate.notes} />
                    </div>
                  )}
                </div>
              )}

              {/* Resume */}
              <ResumeUpload
                candidateId={candidate.id}
                resumeFileName={candidate.resume_file_name}
                onUpdated={(resumeUrl, resumeFileName) => {
                  setCandidate((prev) =>
                    prev ? { ...prev, resume_url: resumeUrl, resume_file_name: resumeFileName } : null
                  );
                }}
              />

              {/* Voice Screening */}
              {(candidate.voice_screening_summary || candidate.voice_screening_disposition) && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Mic className="h-4 w-4" />
                    {t('voiceScreeningResult')}
                  </p>
                  {candidate.voice_screening_disposition && (() => {
                    const variant = getDispositionVariant(candidate.voice_screening_disposition);
                    const variantClasses: Record<string, string> = {
                      success: 'border-green-500/30 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                      info: 'border-blue-500/30 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                      warning: 'border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                      muted: 'border-border bg-muted text-muted-foreground',
                    };
                    const dispositionKey = candidate.voice_screening_disposition.toUpperCase().replace(/-/g, '_');
                    return (
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant] ?? variantClasses.muted}`}>
                        {t(`dispositions.${dispositionKey}`) || candidate.voice_screening_disposition}
                      </span>
                    );
                  })()}
                  {candidate.voice_screening_summary && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{candidate.voice_screening_summary}</p>
                  )}
                </div>
              )}

              {/* Applications */}
              {candidate.applications?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('applicationsLabel')}
                  </p>
                  <div className="space-y-2">
                    {candidate.applications.map((app) => (
                      <div key={app.id} className="flex items-start justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{app.job?.title ?? '—'}</p>
                          {app.job?.client_name && (
                            <p className="text-xs text-muted-foreground">{app.job.client_name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Call history */}
              {candidate.insights?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('callHistory')}
                  </p>
                  <div className="space-y-2">
                    {candidate.insights.map((insight) => (
                      <div key={insight.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          {insight.disposition && (
                            <PipelineStatusBadge status={insight.disposition} />
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">{formatDate(insight.created_at)}</span>
                        </div>
                        {insight.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{insight.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t('candidateNotFound')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
