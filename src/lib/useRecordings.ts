import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CaptureRegion, CapturedNumber, RecordingMetadata } from '@/lib/types';
import { saveVideoBlob, deleteVideoBlob, getVideoBlob } from '@/lib/indexedDB';

export function useRecordings() {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setRecordings(data as RecordingMetadata[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const saveRecording = useCallback(
    async (
      metadata: Omit<RecordingMetadata, 'id' | 'created_at'>,
      blob: Blob
    ): Promise<RecordingMetadata | null> => {
      const { data, error: insertError } = await supabase
        .from('recordings')
        .insert(metadata)
        .select()
        .maybeSingle();

      if (insertError || !data) {
        setError(insertError?.message ?? 'Failed to save recording metadata');
        return null;
      }

      const saved = data as RecordingMetadata;
      await saveVideoBlob(saved.id, blob);
      setRecordings((prev) => [saved, ...prev]);
      return saved;
    },
    []
  );

  const saveCaptureData = useCallback(
    async (recordingId: string, region: CaptureRegion | null, numbers: CapturedNumber[]) => {
      if (region) {
        const { error: regionError } = await supabase.from('recording_regions').insert({
          recording_id: recordingId,
          x: Math.round(region.x),
          y: Math.round(region.y),
          width: Math.round(region.width),
          height: Math.round(region.height),
          source_width: Math.round(region.sourceWidth),
          source_height: Math.round(region.sourceHeight),
        });
        if (regionError) setError(regionError.message);
      }

      if (numbers.length > 0) {
        const { error: numberError } = await supabase.from('captured_numbers').insert(
          numbers.map((number) => ({ ...number, recording_id: recordingId }))
        );
        if (numberError) setError(numberError.message);
      }
    },
    []
  );

  const getCapturedNumbers = useCallback(async (recordingId: string): Promise<CapturedNumber[]> => {
    const { data, error: fetchError } = await supabase
      .from('captured_numbers')
      .select('*')
      .eq('recording_id', recordingId)
      .order('elapsed_ms', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      return [];
    }
    return data as CapturedNumber[];
  }, []);

  const updateRecording = useCallback(
    async (id: string, updates: Partial<Pick<RecordingMetadata, 'title' | 'tags' | 'notes'>>) => {
      const { data, error: updateError } = await supabase
        .from('recordings')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (updateError || !data) {
        setError(updateError?.message ?? 'Failed to update recording');
        return null;
      }
      const updated = data as RecordingMetadata;
      setRecordings((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    []
  );

  const deleteRecording = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('recordings').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    await deleteVideoBlob(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    return true;
  }, []);

  const getRecordingVideoUrl = useCallback(async (id: string): Promise<string | null> => {
    const blob = await getVideoBlob(id);
    return blob ? URL.createObjectURL(blob) : null;
  }, []);

  return {
    recordings,
    loading,
    error,
    saveRecording,
    saveCaptureData,
    getCapturedNumbers,
    updateRecording,
    deleteRecording,
    getRecordingVideoUrl,
    refresh: fetchRecordings,
  };
}
