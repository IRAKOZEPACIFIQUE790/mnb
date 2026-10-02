import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordingStatus, RecorderOptions } from '@/lib/types';

const MIME_CANDIDATES: Record<string, string[]> = {
  mp4: ['video/mp4;codecs=vp9,opus', 'video/mp4;codecs=h264,opus', 'video/mp4'],
  webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
};

function pickSupportedMime(format: 'webm' | 'mp4'): string | null {
  for (const candidate of MIME_CANDIDATES[format]) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  if (format === 'mp4') {
    for (const candidate of MIME_CANDIDATES.webm) {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    }
  }
  return null;
}

function actualFormat(mimeType: string): 'webm' | 'mp4' {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

export function useScreenRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingMeta, setPendingMeta] = useState<{
    mimeType: string;
    format: 'webm' | 'mp4';
    duration: number;
    fileSize: number;
  } | null>(null);
  const [selectionStream, setSelectionStream] = useState<MediaStream | null>(null);
  const [captureCanvas, setCaptureCanvas] = useState<HTMLCanvasElement | null>(null);

  const sourceStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopDrawing = useCallback(() => {
    if (drawFrameRef.current !== null) cancelAnimationFrame(drawFrameRef.current);
    drawFrameRef.current = null;
  }, []);

  const releaseStreams = useCallback(() => {
    if (recordingStreamRef.current && recordingStreamRef.current !== sourceStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    sourceStreamRef.current?.getTracks().forEach((track) => track.stop());
    sourceStreamRef.current = null;
    recordingStreamRef.current = null;
    setSelectionStream(null);
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    stopDrawing();
    releaseStreams();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    canvasRef.current = null;
    setCaptureCanvas(null);
  }, [releaseStreams, stopDrawing, stopTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  const selectScreen = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: false,
      });
      sourceStreamRef.current = stream;
      setSelectionStream(stream);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setSelectionStream(null);
        sourceStreamRef.current = null;
      });
      return stream;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to choose a screen');
      setStatus('error');
      return null;
    }
  }, []);

  const start = useCallback(
    async (options: RecorderOptions) => {
      setError(null);
      setPendingBlob(null);
      setPendingMeta(null);
      setDuration(0);

      try {
        let sourceStream = sourceStreamRef.current;
        if (!sourceStream) {
          sourceStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30 } as MediaTrackConstraints,
            audio: false,
          });
          sourceStreamRef.current = sourceStream;
        }

        const mimeType = pickSupportedMime(options.format);
        if (!mimeType) throw new Error('No supported video MIME type found in this browser.');

        let streamToRecord = sourceStream;
        const region = options.region;
        if (region) {
          const video = document.createElement('video');
          video.srcObject = sourceStream;
          video.muted = true;
          video.playsInline = true;
          await video.play();
          await new Promise<void>((resolve) => {
            if (video.videoWidth) resolve();
            else video.onloadedmetadata = () => resolve();
          });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(region.width));
          canvas.height = Math.max(1, Math.round(region.height));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('The browser could not create a capture canvas.');
          canvasRef.current = canvas;
          setCaptureCanvas(canvas);
          const draw = () => {
            context.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
            drawFrameRef.current = requestAnimationFrame(draw);
          };
          draw();
          const croppedStream = canvas.captureStream(30);
          streamToRecord = new MediaStream([
            ...croppedStream.getVideoTracks(),
            ...sourceStream.getAudioTracks(),
          ]);
        }

        if (options.includeAudio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamToRecord = new MediaStream([
              ...streamToRecord.getVideoTracks(),
              ...streamToRecord.getAudioTracks(),
              ...audioStream.getAudioTracks(),
            ]);
          } catch {
            setError('Microphone permission was declined. Continuing with screen audio only.');
          }
        }

        recordingStreamRef.current = streamToRecord;
        const recorder = new MediaRecorder(streamToRecord, {
          mimeType,
          videoBitsPerSecond: options.videoBitsPerSecond ?? 2_500_000,
        });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const elapsedSeconds = Math.round((Date.now() - startRef.current - pausedAccumRef.current) / 1000);
          setPendingBlob(blob);
          setPendingMeta({ mimeType, format: actualFormat(mimeType), duration: elapsedSeconds, fileSize: blob.size });
          cleanup();
          setStatus('stopped');
        };
        sourceStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
        });

        recorder.start(1000);
        startRef.current = Date.now();
        pausedAccumRef.current = 0;
        setStatus('recording');
        stopTimer();
        timerRef.current = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            setDuration(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
          }
        }, 250);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
        setStatus('error');
        cleanup();
      }
    },
    [cleanup, stopTimer]
  );

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      pauseStartRef.current = Date.now();
      setStatus('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      pausedAccumRef.current += Date.now() - pauseStartRef.current;
      setStatus('recording');
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setDuration(0);
    setError(null);
    setPendingBlob(null);
    setPendingMeta(null);
  }, [cleanup]);

  return { status, duration, error, pendingBlob, pendingMeta, selectionStream, captureCanvas, selectScreen, start, pause, resume, stop, reset, cleanup };
}
