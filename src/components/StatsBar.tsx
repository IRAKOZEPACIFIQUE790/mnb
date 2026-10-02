import { useMemo } from 'react';
import { Film, Clock, HardDrive, Tag } from 'lucide-react';
import type { RecordingMetadata } from '@/lib/types';
import { formatDuration, formatFileSize } from '@/lib/utils';

interface StatsBarProps {
  recordings: RecordingMetadata[];
}

export function StatsBar({ recordings }: StatsBarProps) {
  const stats = useMemo(() => {
    const totalDuration = recordings.reduce((sum, r) => sum + r.duration_seconds, 0);
    const totalSize = recordings.reduce((sum, r) => sum + r.file_size_bytes, 0);
    const allTags = new Set<string>();
    recordings.forEach((r) => r.tags.forEach((t) => allTags.add(t)));

    return {
      count: recordings.length,
      totalDuration,
      totalSize,
      tagCount: allTags.size,
    };
  }, [recordings]);

  const items = [
    {
      label: 'Recordings',
      value: stats.count.toString(),
      icon: Film,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Total Duration',
      value: formatDuration(stats.totalDuration),
      icon: Clock,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Storage Used',
      value: formatFileSize(stats.totalSize),
      icon: HardDrive,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Tags',
      value: stats.tagCount.toString(),
      icon: Tag,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
