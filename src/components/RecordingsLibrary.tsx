import { useMemo, useState } from 'react';
import { Search, Film, Inbox, RefreshCw, AlertCircle } from 'lucide-react';
import type { CapturedNumber, RecordingMetadata } from '@/lib/types';
import { RecordingCard } from '@/components/RecordingCard';
import { RecordingDetail } from '@/components/RecordingDetail';
import { StatsBar } from '@/components/StatsBar';

interface RecordingsLibraryProps {
  recordings: RecordingMetadata[];
  loading: boolean;
  error: string | null;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (id: string, updates: { title?: string; tags?: string[]; notes?: string }) => Promise<RecordingMetadata | null>;
  getVideoUrl: (id: string) => Promise<string | null>;
  getCapturedNumbers: (id: string) => Promise<CapturedNumber[]>;
  onRefresh: () => void;
}

export function RecordingsLibrary({
  recordings,
  loading,
  error,
  onDelete,
  onUpdate,
  getVideoUrl,
  getCapturedNumbers,
  onRefresh,
}: RecordingsLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return recordings;
    const q = search.toLowerCase();
    return recordings.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        (r.notes ?? '').toLowerCase().includes(q)
    );
  }, [recordings, search]);

  const selected = useMemo(
    () => recordings.find((r) => r.id === selectedId) ?? null,
    [recordings, selectedId]
  );

  const handleOpen = async (id: string) => {
    setSelectedId(id);
    setVideoUrl(null);
    const url = await getVideoUrl(id);
    setVideoUrl(url);
  };

  const handleClose = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setSelectedId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const ok = await onDelete(selectedId);
    if (ok) {
      handleClose();
    }
  };

  const handleUpdate = async (id: string, updates: { title?: string; tags?: string[]; notes?: string }) => {
    await onUpdate(id, updates);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-600" />
          <p className="mt-3 text-sm text-slate-500">Loading your recordings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
        <h2 className="mt-4 text-lg font-bold text-white">Failed to load recordings</h2>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-6 rounded-xl border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60">
          <Inbox className="h-8 w-8 text-slate-600" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-white">No recordings yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Head to the Studio tab to create your first screen recording.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <StatsBar recordings={recordings} />

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, tags, or notes..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-slate-700"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Film className="mx-auto h-10 w-10 text-slate-700" />
            <p className="mt-4 text-sm text-slate-500">No recordings match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                onClick={() => handleOpen(recording.id)}
                onDelete={() => onDelete(recording.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <RecordingDetail
          recording={selected}
          videoUrl={videoUrl}
          getCapturedNumbers={getCapturedNumbers}
          onClose={handleClose}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
