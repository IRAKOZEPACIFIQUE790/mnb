import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Table2 } from 'lucide-react';
import type { CapturedNumber, RecordingMetadata } from '@/lib/types';
import { downloadBlob, formatCapturedTimestamp } from '@/lib/utils';

interface CapturedNumbersLibraryProps {
  recordings: RecordingMetadata[];
  getCapturedNumbers: (id: string) => Promise<CapturedNumber[]>;
}

interface NumberLogRow {
  recording: RecordingMetadata;
  event: CapturedNumber;
}

export function CapturedNumbersLibrary({ recordings, getCapturedNumbers }: CapturedNumbersLibraryProps) {
  const [rows, setRows] = useState<NumberLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all(
      recordings.map(async (recording) => {
        const numbers = await getCapturedNumbers(recording.id);
        return numbers.map((event) => ({ recording, event }));
      })
    ).then((groups) => {
      if (active) {
        setRows(groups.flat().sort((a, b) => b.event.captured_at.localeCompare(a.event.captured_at)));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [getCapturedNumbers, recordings]);

  const exportRows = useMemo(
    () => rows.map(({ recording, event }) => ({
      recording: recording.title,
      value: event.value,
      numeric_value: event.numeric_value,
      captured_at: event.captured_at,
      elapsed_ms: event.elapsed_ms,
      confidence: event.confidence,
    })),
    [rows]
  );

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'captured-number-log.json');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
              <Table2 className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Captured Number Log</h2>
              <p className="text-sm text-slate-400">Every detected number saved with its exact capture timestamp.</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export Number Log
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-slate-600" />
              <p className="mt-3 text-sm text-slate-500">Loading captured numbers...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <Table2 className="h-10 w-10 text-slate-700" />
            <h3 className="mt-4 text-lg font-semibold text-white">No captured numbers yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">Select a number area in Studio and start a recording to build this log.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-800 bg-slate-800/40">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Captured date and time</th>
                  <th className="px-5 py-4 font-semibold">Number</th>
                  <th className="px-5 py-4 font-semibold">Recording</th>
                  <th className="px-5 py-4 font-semibold">Elapsed</th>
                  <th className="px-5 py-4 font-semibold">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {rows.map(({ recording, event }, index) => (
                  <tr key={event.id ?? `${event.captured_at}-${index}`} className="transition-colors hover:bg-slate-800/25">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-300">
                      {formatCapturedTimestamp(event.captured_at)}
                    </td>
                    <td className="px-5 py-4 font-mono text-lg font-bold text-sky-300">{event.value}</td>
                    <td className="max-w-[240px] truncate px-5 py-4 text-sm text-slate-300">{recording.title}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-sm text-slate-500">{event.elapsed_ms} ms</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{event.confidence == null ? '—' : `${event.confidence.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
