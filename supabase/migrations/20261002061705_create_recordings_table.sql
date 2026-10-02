/*
# Create recordings table (single-tenant, no auth)

1. Purpose
   Stores metadata for screen recordings made in the app. Actual video blobs
   are stored locally in IndexedDB (too large for remote storage); this table
   holds the searchable metadata so recordings can be listed, tagged, and recalled.

2. New Tables
   - `recordings`
     - `id` (uuid, primary key)
     - `title` (text, not null) — user-editable name for the recording
     - `duration_seconds` (integer, not null) — length of recording in seconds
     - `file_size_bytes` (bigint, not null) — size of the video blob in bytes
     - `mime_type` (text, not null) — e.g. "video/webm"
     - `format` (text, not null) — e.g. "webm"
     - `thumbnail_data_url` (text, nullable) — base64 data URL of a captured frame
     - `tags` (text[], default empty array) — user-assigned tags for search
     - `notes` (text, nullable) — free-form notes about the recording
     - `created_at` (timestamptz, default now())

3. Security
   - Enable RLS on `recordings`.
   - Allow anon + authenticated CRUD because the data is intentionally shared/public
     (single-tenant app with no sign-in screen).
*/

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  duration_seconds integer NOT NULL,
  file_size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  format text NOT NULL,
  thumbnail_data_url text,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_recordings" ON recordings;
CREATE POLICY "anon_select_recordings" ON recordings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_recordings" ON recordings;
CREATE POLICY "anon_insert_recordings" ON recordings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_recordings" ON recordings;
CREATE POLICY "anon_update_recordings" ON recordings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_recordings" ON recordings;
CREATE POLICY "anon_delete_recordings" ON recordings FOR DELETE
  TO anon, authenticated USING (true);
