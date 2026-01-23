-- Add player function + availability on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS player_function text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS available_for_team boolean NOT NULL DEFAULT false;

-- Add integrated games on teams
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS integrated_games jsonb;

-- Default value for integrated_games
ALTER TABLE public.teams
ALTER COLUMN integrated_games SET DEFAULT '[]'::jsonb;

-- Basic sanity check: ensure array-like json
DO $$
BEGIN
  -- no-op block; keeping for future constraints
END $$;
