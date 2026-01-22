-- Add missing social fields to teams for profile cards
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS youtube_url text;

-- Optional: keep updated_at in sync if a trigger exists; if not, skip.
-- (No RLS changes needed because teams are already publicly readable and owner-writable.)
