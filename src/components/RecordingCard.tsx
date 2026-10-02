import { Play, Clock, HardDrive, Trash2 } from 'lucide-react';
import type { RecordingMetadata } from '@/lib/types';
import { formatDuration, formatFileSize, formatRelativeTime } from '@/lib/utils';

interface RecordingCardProps {
  recording: RecordingMetadata;
  onClick: () => void;
  onDelete: () => void;
}

export function RecordingCard({ recording, onClick, onDelete }: RecordingCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        {recording.thumbnail_data_url ? (
          <img
            src={recording.thumbnail_data_url}
            alt={recording.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-10 w-10 text-slate-600" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {formatDuration(recording.duration_seconds)}
        </div>
        {/* Format badge */}
        <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold uppercase text-white backdrop-blur-sm">
          {recording.format}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-white">{recording.title}</h3>
        <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(recording.created_at)}</p>

        {recording.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recording.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
            {recording.tags.length > 3 && (
              <span className="text-xs text-slate-600">+{recording.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(recording.duration_seconds)}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(recording.file_size_bytes)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
