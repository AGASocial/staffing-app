'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResumeUploadProps {
  candidateId: string;
  resumeFileName: string | null;
  onUpdated: (resumeUrl: string | null, resumeFileName: string | null) => void;
}

export function ResumeUpload({ candidateId, resumeFileName, onUpdated }: ResumeUploadProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/candidates/${candidateId}/resume`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('resumeUploadError'));
        return;
      }

      const data = await res.json();
      onUpdated(data.resume_url, data.resume_file_name);
    } catch {
      setError(t('resumeUploadError'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resume`);
      if (!res.ok) {
        setError(t('resumeDownloadError'));
        return;
      }
      const { url, file_name } = await res.json();
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name ?? 'resume';
      a.target = '_blank';
      a.click();
    } catch {
      setError(t('resumeDownloadError'));
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('resumeDeleteConfirm'))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resume`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t('resumeDeleteError'));
        return;
      }
      onUpdated(null, null);
    } catch {
      setError(t('resumeDeleteError'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('resume')}
      </p>

      {resumeFileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate text-sm text-foreground" title={resumeFileName}>
            {resumeFileName}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            title={t('download')}
            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title={t('delete')}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {uploading ? t('uploading') : t('resumeUploadPrompt')}
          </p>
          <p className="text-xs text-muted-foreground/70">PDF, DOC, DOCX · max 10 MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />

      {/* Replace resume button when one already exists */}
      {resumeFileName && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('resumeReplace')}
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
