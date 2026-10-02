import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  Monitor,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Download,
  Save,
  RefreshCw,
  Film,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useScreenRecorder } from '@/lib/useScreenRecorder';
import { useNumericCapture } from '@/lib/useNumericCapture';
import { useRecordings } from '@/lib/useRecordings';
import { RecordingTimer } from '@/components/RecordingTimer';
import { generateThumbnail, formatFileSize, formatDuration, downloadBlob } from '@/lib/utils';
import type { CaptureRegion, RecordingFormat } from '@/lib/types';

interface RecordingStudioProps {
  onSaved: () => void;
}

export function RecordingStudio({ onSaved }: RecordingStudioProps) {
  const {
    status,
    duration,
    error,
    pendingBlob,
    pendingMeta,
    selectionStream,
    captureCanvas,
    selectScreen,
    start,
    pause,
    resume,
    stop,
    reset,
    cleanup,
  } = useScreenRecorder();
  const { saveRecording, saveCaptureData } = useRecordings();
  const { events, processing, start: startNumericCapture, stop: stopNumericCapture, clearEvents } = useNumericCapture();

  const [includeAudio, setIncludeAudio] = useState(true);
  const [format, setFormat] = useState<RecordingFormat>('webm');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectingScreen, setSelectingScreen] = useState(false);
  const [selectionRegion, setSelectionRegion] = useState<CaptureRegion | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const selectionVideoRef = useRef<HTMLVideoElement>(null);
  const selectionSurfaceRef = useRef<HTMLDivElement>(null);
  const numericStartedAtRef = useRef(0);

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isStopped = status === 'stopped';
  const isIdle = status === 'idle';

  useEffect(() => {
    const video = selectionVideoRef.current;
    if (!video || !selectionStream) return;
    video.srcObject = selectionStream;
    void video.play();
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [selectionStream]);

  useEffect(() => {
    if (isRecording && captureCanvas) {
      void startNumericCapture(captureCanvas, numericStartedAtRef.current);
    } else if (!isRecording && !isPaused) {
      stopNumericCapture();
    }
  }, [captureCanvas, isPaused, isRecording, startNumericCapture, stopNumericCapture]);

  const handleChooseScreen = async () => {
    const stream = await selectScreen();
    if (stream) {
      setSelectionBox(null);
      setSelectionRegion(null);
      setSelectingScreen(true);
    }
  };

  const getSelectionPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const surface = selectionSurfaceRef.current;
    const video = selectionVideoRef.current;
    if (!surface || !video) return null;
    const bounds = surface.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    return { x, y, displayWidth: bounds.width, displayHeight: bounds.height, sourceWidth: video.videoWidth, sourceHeight: video.videoHeight };
  };

  const handleSelectionStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = getSelectionPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart(point);
    setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleSelectionMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const point = getSelectionPoint(event);
    if (!point) return;
    setSelectionBox({
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    });
  };

  const handleSelectionEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const point = getSelectionPoint(event);
    if (!point) return;
    const x = Math.min(dragStart.x, point.x);
    const y = Math.min(dragStart.y, point.y);
    const width = Math.abs(point.x - dragStart.x);
    const height = Math.abs(point.y - dragStart.y);
    setDragStart(null);
    if (width < 12 || height < 12) return;
    setSelectionBox({ x, y, width, height });
    setSelectionRegion({
      x: (x / point.displayWidth) * point.sourceWidth,
      y: (y / point.displayHeight) * point.sourceHeight,
      width: (width / point.displayWidth) * point.sourceWidth,
      height: (height / point.displayHeight) * point.sourceHeight,
      sourceWidth: point.sourceWidth,
      sourceHeight: point.sourceHeight,
    });
  };

  const handleStart = () => {
    if (!selectionRegion) return;
    setSavedSuccess(false);
    numericStartedAtRef.current = Date.now();
    start({ format, includeAudio, region: selectionRegion });
    setSelectingScreen(false);
  };

  const handleSave = async () => {
    if (!pendingBlob || !pendingMeta) return;
    setSaving(true);
    setSavedSuccess(false);

    const thumb = await generateThumbnail(pendingBlob);

    const finalTitle = title.trim() || `Recording ${new Date().toLocaleString()}`;
    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await saveRecording(
      {
        title: finalTitle,
        duration_seconds: pendingMeta.duration,
        file_size_bytes: pendingMeta.fileSize,
        mime_type: pendingMeta.mimeType,
        format: pendingMeta.format,
        thumbnail_data_url: thumb,
        tags: tagsArray,
        notes: notes.trim() || null,
      },
      pendingBlob
    );

    setSaving(false);
    if (result) {
      await saveCaptureData(result.id, selectionRegion, events);
      setSavedSuccess(true);
      onSaved();
      setTimeout(() => {
        reset();
        setTitle('');
        setTags('');
        setNotes('');
            setSavedSuccess(false);
        setSelectionRegion(null);
        clearEvents();
      }, 2000);
    }
  };

  const handleDiscard = () => {
    reset();
    setTitle('');
    setTags('');
    setNotes('');
    setSavedSuccess(false);
    setSelectionRegion(null);
    clearEvents();
  };

  const handleDownload = () => {
    if (!pendingBlob || !pendingMeta) return;
    const ext = pendingMeta.format;
    const filename = `${title.trim() || 'recording'}.${ext}`;
    downloadBlob(pendingBlob, filename);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Idle state — configuration + start */}
      {isIdle && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="border-b border-slate-800 bg-slate-800/30 px-6 py-4">
              <h2 className="text-lg font-bold text-white">New Recording</h2>
              <p className="text-sm text-slate-400">
                Configure your capture settings, then press record.
              </p>
            </div>

            <div className="space-y-6 p-6">
              {/* Format selection */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Video Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['webm', 'mp4'] as RecordingFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                        format === f
                          ? 'border-rose-500/60 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                          : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                      }`}
                    >
                      <Film
                        className={`h-5 w-5 ${format === f ? 'text-rose-400' : 'text-slate-500'}`}
                      />
                      <div className="text-left">
                        <div className={`text-sm font-semibold ${format === f ? 'text-white' : 'text-slate-300'}`}>
                          {f.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {f === 'webm' ? 'Smaller file, web-native' : 'Broad compatibility'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  MP4 may fall back to WebM if your browser doesn't support it.
                </p>
              </div>

              {/* Audio toggle */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Audio Source
                </label>
                <button
                  onClick={() => setIncludeAudio((v) => !v)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-all duration-200 ${
                    includeAudio
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'
                  }`}
                >
                  {includeAudio ? (
                    <Mic className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <MicOff className="h-5 w-5 text-slate-500" />
                  )}
                  <div className="text-left flex-1">
                    <div className={`text-sm font-semibold ${includeAudio ? 'text-white' : 'text-slate-300'}`}>
                      {includeAudio ? 'Microphone On' : 'Microphone Off'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {includeAudio
                        ? 'Your mic will be captured alongside the screen'
                        : 'Only screen video will be recorded'}
                    </div>
                  </div>
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      includeAudio ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        includeAudio ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-800/30 px-6 py-4">
              <button
                onClick={handleChooseScreen}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-600 hover:to-orange-600 hover:shadow-rose-500/35 active:scale-[0.98]"
              >
                <Monitor className="h-6 w-6" />
                Choose Area & Start
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Choose a screen, then drag over the exact area containing the numbers.
              </p>
            </div>
          </div>

          {/* Browser support info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-300">Browser Compatibility</h3>
            <div className="grid grid-cols-1 gap-3 text-xs text-slate-400 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Chrome / Edge
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Firefox
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                Safari (limited)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recording / paused state */}
      {(isRecording || isPaused) && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
            <div
              className={`px-6 py-4 ${
                isPaused
                  ? 'border-b border-amber-500/30 bg-amber-500/10'
                  : 'border-b border-rose-500/30 bg-rose-500/10'
              }`}
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      isPaused ? 'bg-amber-500/20' : 'bg-rose-500/20'
                    }`}
                  >
                    {isPaused ? (
                      <Pause className="h-6 w-6 text-amber-400" />
                    ) : (
                      <div className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {isPaused ? 'Recording Paused' : 'Recording in Progress'}
                    </p>
                    <p className="text-sm text-slate-300">Your screen is being captured</p>
                  </div>
                </div>
                <RecordingTimer duration={duration} isPaused={isPaused} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 sm:flex-row sm:justify-center">
              {isPaused ? (
                <button
                  onClick={resume}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
                >
                  <Play className="h-5 w-5" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pause}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95"
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </button>
              )}
              <button
                onClick={stop}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-95"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
              <div className="text-sm text-slate-400">
                <p className="font-medium text-slate-300">Recording live</p>
                <p className="mt-1">
                  You can interact with other tabs and applications while recording continues in the
                  background. Use the browser's sharing indicator to manage your capture session.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-sky-200">Numeric capture</p>
                <p className="mt-1 text-xs text-sky-100/70">
                  {processing ? 'Scanning the selected area for changed numbers...' : 'OCR will scan the selected area while recording.'}
                </p>
              </div>
              <span className="rounded-full bg-sky-400/20 px-2.5 py-1 text-xs font-bold text-sky-200">
                {events.length} captured
              </span>
            </div>
            {events.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {events.slice(-8).map((event, index) => (
                  <span key={`${event.elapsed_ms}-${index}`} className="rounded-lg border border-sky-400/20 bg-slate-950/30 px-3 py-1.5 font-mono text-sm text-white">
                    {event.value} <span className="text-xs text-sky-200/60">at {(event.elapsed_ms / 1000).toFixed(1)}s</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectingScreen && selectionStream && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-slate-800 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Select the number area</h2>
                <p className="text-sm text-slate-400">Drag a rectangle around the numbers you want to track.</p>
              </div>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">Selection mode</span>
            </div>
            <div className="bg-black p-4">
              <div
                ref={selectionSurfaceRef}
                className="relative mx-auto aspect-video max-h-[62vh] w-full max-w-4xl touch-none select-none overflow-hidden border border-slate-700"
                onPointerDown={handleSelectionStart}
                onPointerMove={handleSelectionMove}
                onPointerUp={handleSelectionEnd}
              >
                <video ref={selectionVideoRef} muted playsInline className="h-full w-full object-contain" />
                <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
                {selectionBox && (
                  <div
                    className="pointer-events-none absolute border-2 border-rose-400 bg-rose-400/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]"
                    style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-800/30 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => { cleanup(); setSelectingScreen(false); }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!selectionRegion}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:from-rose-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Record Selected Area
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stopped — review & save */}
      {isStopped && pendingBlob && pendingMeta && (
        <div className="space-y-6">
          {savedSuccess ? (
            <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h2 className="mt-4 text-xl font-bold text-white">Recording Saved!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Your recording has been added to the library.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="border-b border-slate-800 bg-slate-800/30 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">Review Recording</h2>
                  <p className="text-sm text-slate-400">
                    Preview, name, and save your recording to the library.
                  </p>
                </div>

                {/* Video preview */}
                <div className="p-6">
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
                    <video
                      src={URL.createObjectURL(pendingBlob)}
                      controls
                      className="aspect-video w-full"
                    />
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {formatDuration(pendingMeta.duration)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                      <p className="text-xs text-slate-500">File Size</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {formatFileSize(pendingMeta.fileSize)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                      <p className="text-xs text-slate-500">Format</p>
                      <p className="mt-1 text-lg font-bold text-white uppercase">
                        {pendingMeta.format}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata form */}
                <div className="space-y-4 border-t border-slate-800 p-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`Recording ${new Date().toLocaleString()}`}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-rose-500/60 focus:bg-slate-800"
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-rose-500/60 focus:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional description or context..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-rose-500/60 focus:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-800/30 p-6 sm:flex-row">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:from-rose-600 hover:to-orange-600 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save to Library
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-95"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-slate-400 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div className="mx-auto max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
          <h2 className="mt-4 text-lg font-bold text-white">Recording Failed</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button
            onClick={() => {
              reset();
            }}
            className="mt-6 rounded-xl border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
