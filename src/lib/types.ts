export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface CapturedNumber {
  id?: string;
  recording_id?: string;
  value: string;
  numeric_value: number | null;
  captured_at: string;
  elapsed_ms: number;
  confidence: number | null;
  source: 'ocr';
}

export interface RecordingMetadata {
  id: string;
  title: string;
  duration_seconds: number;
  file_size_bytes: number;
  mime_type: string;
  format: string;
  thumbnail_data_url: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export interface StoredRecording extends RecordingMetadata {
  blob: Blob;
}

export type Tab = 'studio' | 'library' | 'data';

export type RecordingFormat = 'webm' | 'mp4';

export interface RecorderOptions {
  format: RecordingFormat;
  includeAudio: boolean;
  videoBitsPerSecond?: number;
  region?: CaptureRegion | null;
}
