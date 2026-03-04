-- Migration to add live_streams column to trainings table
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS live_streams JSONB DEFAULT '[]'::jsonb;

-- Comment on column for better documentation
COMMENT ON COLUMN trainings.live_streams IS 'Stores an array of live stream objects (id, title, url, round_id)';
