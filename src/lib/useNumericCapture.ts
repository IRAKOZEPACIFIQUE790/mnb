import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, type Worker } from 'tesseract.js';
import type { CapturedNumber } from '@/lib/types';

function extractNumber(text: string): string | null {
  const normalized = text.replace(/\s/g, '').replace(/,/g, '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match?.[0] ?? null;
}

export function useNumericCapture() {
  const [events, setEvents] = useState<CapturedNumber[]>([]);
  const [processing, setProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtRef = useRef(0);
  const lastValueRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  const clearEvents = useCallback(() => {
    setEvents([]);
    lastValueRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    canvasRef.current = null;
    setProcessing(false);
    busyRef.current = false;
  }, []);

  const start = useCallback(
    async (canvas: HTMLCanvasElement, startedAt: number) => {
      stop();
      clearEvents();
      canvasRef.current = canvas;
      startedAtRef.current = startedAt;
      setProcessing(true);

      if (!workerRef.current) {
        workerRef.current = await createWorker('eng');
        await workerRef.current.setParameters({
          tessedit_char_whitelist: '0123456789.,-xX',
        });
      }

      const scan = async () => {
        if (busyRef.current || !canvasRef.current || !workerRef.current) return;
        busyRef.current = true;
        try {
          const result = await workerRef.current.recognize(canvasRef.current);
          const value = extractNumber(result.data.text);
          if (value && value !== lastValueRef.current) {
            lastValueRef.current = value;
            const now = Date.now();
            setEvents((previous) => [
              ...previous,
              {
                value,
                numeric_value: Number(value),
                captured_at: new Date(now).toISOString(),
                elapsed_ms: now - startedAtRef.current,
                confidence: result.data.confidence ?? null,
                source: 'ocr',
              },
            ]);
          }
        } finally {
          busyRef.current = false;
        }
      };

      await scan();
      timerRef.current = setInterval(scan, 900);
    },
    [clearEvents, stop]
  );

  useEffect(() => {
    return () => {
      stop();
      if (workerRef.current) {
        void workerRef.current.terminate();
      }
    };
  }, [stop]);

  return { events, processing, start, stop, clearEvents };
}
