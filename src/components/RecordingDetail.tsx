import { useEffect, useState } from 'react';
import {
  X,
  Download,
  Trash2,
  Save,
  Clock,
  HardDrive,
  Calendar,
  Film,
  RefreshCw,
} from 'lucide-react';
import type { CapturedNumber, RecordingMetadata } from '@/lib/types';
import {
  formatDuration,
  formatFileSize,
  formatDate,
  formatCapturedTimestamp,
  downloadBlob,
} from '@/lib/utils';

interface RecordingDetailProps {
  recording: RecordingMetadata;
  videoUrl: string | null;
  getCapturedNumbers: (id: string) => Promise<CapturedNumber[]>;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (id: string, updates: { title?: string; tags?: string[]; notes?: string }) => void;
}

export function RecordingDetail({
  recording,
  videoUrl,
  getCapturedNumbers,
  onClose,
  onDelete,
  onUpdate,
}: RecordingDetailProps) {
  const [title, setTitle] = useState(recording.title);
  const [tags, setTags] = useState(recording.tags.join(', '));
  const [notes, setNotes] = useState(recording.notes ?? '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [capturedNumbers, setCapturedNumbers] = useState<CapturedNumber[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(true);

  useEffect(() => {
    setTitle(recording.title);
    setTags(recording.tags.join(', '));
    setNotes(recording.notes ?? '');
    setDirty(false);
  }, [recording]);

  useEffect(() => {
    const changed =
      title !== recording.title ||
      tags !== recording.tags.join(', ') ||
      notes !== (recording.notes ?? '');
    setDirty(changed);
  }, [title, tags, notes, recording]);

  useEffect(() => {
    if (videoUrl) {
      fetch(videoUrl)
        .then((r) => r.blob())
        .then(setBlob)
        .catch(() => setBlob(null));
    }
  }, [videoUrl]);

  useEffect(() => {
    let active = true;
    setNumbersLoading(true);
    void getCapturedNumbers(recording.id).then((numbers) => {
      if (active) {
        setCapturedNumbers(numbers);
        setNumbersLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [getCapturedNumbers, recording.id]);

  const handleSave = () => {
    setSaving(true);
    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onUpdate(recording.id, {
      title: title.trim() || recording.title,
      tags: tagsArray,
      notes: notes.trim() || undefined,
    });
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 500);
  };

  const handleDownload = () => {
    if (!blob) return;
    const filename = `${recording.title.replace(/[^a-z0-9]/gi, '_')}.${recording.format}`;
    downloadBlob(blob, filename);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${recording.title}"? This cannot be undone.`)) {
      onDelete();
    }
  };

  const handleDownloadNumbers = () => {
    const exportBlob = new Blob([JSON.stringify(capturedNumbers, null, 2)], { type: 'application/json' });
    downloadBlob(exportBlob, `${recording.title.replace(/[^a-z0-9]/gi, '_')}-numbers.json`);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="truncate text-lg font-bold text-white">Recording Details</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
            {/* Video preview */}
            <div className="lg:col-span-3 bg-black">
              {videoUrl ? (
                <video src={videoUrl} controls className="aspect-video w-full" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-600" />
                    <p className="mt-3 text-sm text-slate-500">Loading video...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-4 border-t border-slate-800 p-6 lg:col-span-2 lg:border-l lg:border-t-0">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </div>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatDuration(recording.duration_seconds)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <HardDrive className="h-3.5 w-3.5" /> Size
                  </div>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatFileSize(recording.file_size_bytes)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Film className="h-3.5 w-3.5" /> Format
                  </div>
                  <p className="mt-1 text-sm font-bold text-white uppercase">{recording.format}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" /> Created
                  </div>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatDate(recording.created_at)}
                  </p>
                </div>
              </div>

              {/* Editable fields */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tags <span className="font-normal normal-case text-slate-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="demo, tutorial, meeting"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No notes yet..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-rose-500/60"
                />
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Captured numbers</p>
                    <p className="mt-1 text-xs text-slate-500">Stored separately with capture times</p>
                  </div>
                  <button
                    onClick={handleDownloadNumbers}
                    disabled={capturedNumbers.length === 0}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40"
                  >
                    Export JSON
                  </button>
                </div>
                {numbersLoading ? (
                  <p className="mt-3 text-xs text-slate-500">Loading captured values...</p>
                ) : capturedNumbers.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">No number changes were detected.</p>
                ) : (
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                    {capturedNumbers.map((number, index) => (
                      <div key={number.id ?? `${number.elapsed_ms}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-950/30 px-3 py-2 font-mono text-xs">
                        <span className="font-bold text-sky-200">{number.value}</span>
                        <span className="text-right text-slate-500">{formatCapturedTimestamp(number.captured_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-800/30 px-6 py-4 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:from-rose-600 hover:to-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
          <button
            onClick={handleDownload}
            disabled={!blob}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/20 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
