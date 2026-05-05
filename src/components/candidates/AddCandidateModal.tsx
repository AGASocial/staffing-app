'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Candidate, CandidatePipelineStatus } from '@/models/candidate';
import { PIPELINE_STATUSES } from '@/models/candidate';

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (candidate: Candidate) => void;
}

export function AddCandidateModal({ open, onClose, onCreated }: AddCandidateModalProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          source: form.source.trim() || null,
          location: form.location.trim() || null,
          availability: form.availability.trim() || null,
          skills: form.skills.trim() || null,
          notes: form.notes.trim() || null,
          pipeline_status: form.pipeline_status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('errorAddingCandidate'));
        return;
      }

      const created: Candidate = await res.json();
      onCreated(created);
      setForm({ name: '', email: '', phone: '', source: '', location: '', availability: '', skills: '', notes: '', pipeline_status: 'applied' });
      onClose();
    } catch {
      setError(t('errorAddingCandidate'));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('addCandidateTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Jane Doe"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('email')} *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="jane@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('phone')} *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="555-000-1234"
              />
            </div>
          </div>

          {/* Source + Pipeline Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source">{t('source')}</Label>
              <Input
                id="source"
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="LinkedIn, Indeed…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pipeline_status">{t('candidatePipelineLabel')}</Label>
              <select
                id="pipeline_status"
                name="pipeline_status"
                value={form.pipeline_status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PIPELINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`candidatePipelineStatuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location + Availability */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="location">{t('location')}</Label>
              <Input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Chicago, IL"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availability">{t('candidateAvailability')}</Label>
              <Input
                id="availability"
                name="availability"
                value={form.availability}
                onChange={handleChange}
                placeholder="Immediately"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <Label htmlFor="skills">{t('candidateSkills')}</Label>
            <Input
              id="skills"
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Forklift, CDL, Bilingual…"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t('notes')}</Label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder={t('candidateNotesPlaceholder')}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('addCandidateTitle')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
