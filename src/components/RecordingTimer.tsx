import { formatTimer } from '@/lib/utils';

interface RecordingTimerProps {
  duration: number;
  isPaused: boolean;
}

export function RecordingTimer({ duration, isPaused }: RecordingTimerProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-5 py-2.5 transition-all duration-300 ${
        isPaused
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-rose-500/40 bg-rose-500/10'
      }`}
    >
      <span className="relative flex h-3 w-3">
        {!isPaused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-3 w-3 rounded-full ${
            isPaused ? 'bg-amber-400' : 'bg-rose-500'
          }`}
        />
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
        {formatTimer(duration)}
      </span>
      {isPaused && (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
          PAUSED
        </span>
      )}
    </div>
  );
}
