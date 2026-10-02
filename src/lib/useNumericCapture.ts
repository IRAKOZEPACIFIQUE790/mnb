import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, type Worker } from 'tesseract.js';
import type { CapturedNumber } from '@/lib/types';

function extractNumber(text: string): string | null {
  const normalized = text.replace(/\s/g, '').replace(/,/g, '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match?.[0] ?? null;
}

const SCAN_INTERVAL_MS = 900;

export function useNumericCapture() {
  const [events, setEvents] = useState<CapturedNumber[]>([]);
  const [processing, setProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const lastValueRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    lastValueRef.current = null;
  }, []);

  const scan = useCallback(async () => {
    const canvas = canvasRef.current;
    const worker = workerRef.current;
    if (busyRef.current || !canvas || !worker || pauseStartRef.current !== null) return;
    busyRef.current = true;
    const frameAt = Date.now();
    const elapsedMs = frameAt - startedAtRef.current - pausedAccumRef.current;
    try {
      const result = await worker.recognize(canvas);
      if (canvasRef.current !== canvas) return;
      const value = extractNumber(result.data.text);
      if (value && value !== lastValueRef.current) {
        lastValueRef.current = value;
        setEvents((previous) => [
          ...previous,
          {
            value,
            numeric_value: Number(value),
            captured_at: new Date(frameAt).toISOString(),
            elapsed_ms: elapsedMs,
            confidence: result.data.confidence ?? null,
            source: 'ocr',
          },
        ]);
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    void scan();
    timerRef.current = setInterval(scan, SCAN_INTERVAL_MS);
  }, [clearTimer, scan]);

  const stop = useCallback(() => {
    clearTimer();
    canvasRef.current = null;
    pauseStartRef.current = null;
    setProcessing(false);
    busyRef.current = false;
  }, [clearTimer]);

  const start = useCallback(
    async (canvas: HTMLCanvasElement, startedAt: number) => {
      stop();
      clearEvents();
      canvasRef.current = canvas;
      startedAtRef.current = startedAt;
      pausedAccumRef.current = 0;
      setProcessing(true);

      if (!workerRef.current) {
        workerRef.current = await createWorker('eng');
        await workerRef.current.setParameters({
          tessedit_char_whitelist: '0123456789.,-xX',
        });
      }

      if (canvasRef.current !== canvas || pauseStartRef.current !== null) return;
      startTimer();
    },
    [clearEvents, startTimer, stop]
  );

  const pause = useCallback(() => {
    if (!canvasRef.current || pauseStartRef.current !== null) return;
    clearTimer();
    pauseStartRef.current = Date.now();
    setProcessing(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (!canvasRef.current || pauseStartRef.current === null) return;
    pausedAccumRef.current += Date.now() - pauseStartRef.current;
    pauseStartRef.current = null;
    setProcessing(true);
    if (workerRef.current) startTimer();
  }, [startTimer]);

  useEffect(() => {
    return () => {
      stop();
      if (workerRef.current) {
        void workerRef.current.terminate();
      }
    };
  }, [stop]);

  return { events, processing, start, pause, resume, stop, clearEvents };
}
