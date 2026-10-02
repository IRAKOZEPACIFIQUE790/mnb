/*
# Add selectable capture regions and timestamped numeric events

1. Purpose
   Adds durable metadata for the region selected during a screen recording and
   the numbers detected from that region while recording.

2. New Tables
   - `recording_regions`
     - `id` (uuid, primary key)
     - `recording_id` (uuid, references recordings) — recording that used the region
     - `x`, `y`, `width`, `height` (integer) — selected source-screen pixel rectangle
     - `source_width`, `source_height` (integer) — full shared-screen dimensions
     - `created_at` (timestamptz)
   - `captured_numbers`
     - `id` (uuid, primary key)
     - `recording_id` (uuid, references recordings) — parent recording
     - `value` (text) — exact OCR text retained for traceability
     - `numeric_value` (numeric, nullable) — parsed numeric value when possible
     - `captured_at` (timestamptz) — wall-clock capture time
     - `elapsed_ms` (bigint) — milliseconds from recording start
     - `confidence` (real, nullable) — OCR confidence from 0 to 100
     - `source` (text) — currently `ocr`

3. Security
   - Enable RLS on both tables.
   - Allow anon + authenticated CRUD because this app has no sign-in screen and
     recordings are intentionally shared within this single-tenant workspace.

4. Data safety
   - Existing recordings are not changed or removed.
   - Child rows are deleted automatically only when their parent recording is deleted.
*/

CREATE TABLE IF NOT EXISTS recording_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  x integer NOT NULL,
  y integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  source_width integer NOT NULL,
  source_height integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS captured_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  value text NOT NULL,
  numeric_value numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  elapsed_ms bigint NOT NULL,
  confidence real,
  source text NOT NULL DEFAULT 'ocr'
);

CREATE INDEX IF NOT EXISTS recording_regions_recording_id_idx ON recording_regions(recording_id);
CREATE INDEX IF NOT EXISTS captured_numbers_recording_time_idx ON captured_numbers(recording_id, elapsed_ms);

ALTER TABLE recording_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recording_regions" ON recording_regions;
CREATE POLICY "anon_select_recording_regions" ON recording_regions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_recording_regions" ON recording_regions;
CREATE POLICY "anon_insert_recording_regions" ON recording_regions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_recording_regions" ON recording_regions;
CREATE POLICY "anon_update_recording_regions" ON recording_regions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_recording_regions" ON recording_regions;
CREATE POLICY "anon_delete_recording_regions" ON recording_regions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_captured_numbers" ON captured_numbers;
CREATE POLICY "anon_select_captured_numbers" ON captured_numbers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_captured_numbers" ON captured_numbers;
CREATE POLICY "anon_insert_captured_numbers" ON captured_numbers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_captured_numbers" ON captured_numbers;
CREATE POLICY "anon_update_captured_numbers" ON captured_numbers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_captured_numbers" ON captured_numbers;
CREATE POLICY "anon_delete_captured_numbers" ON captured_numbers FOR DELETE TO anon, authenticated USING (true);
