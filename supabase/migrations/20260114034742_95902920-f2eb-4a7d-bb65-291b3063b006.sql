-- Create team_lines table to support multiple lines per team
CREATE TABLE IF NOT EXISTS public.team_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  game_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add optional line_id to team_members so a member can belong to a specific line
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS line_id uuid NULL REFERENCES public.team_lines(id) ON DELETE SET NULL;

-- Add optional line_id to training_registrations so a specific line can register to a training
ALTER TABLE public.training_registrations
ADD COLUMN IF NOT EXISTS line_id uuid NULL REFERENCES public.team_lines(id) ON DELETE SET NULL;