-- Create training_player_stats without FK constraints to training_matches (id is not unique)
CREATE TABLE IF NOT EXISTS public.training_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  line_id uuid REFERENCES public.team_lines(id) ON DELETE SET NULL,
  team_member_id text NULL,
  player_name text NOT NULL,
  kills integer NOT NULL DEFAULT 0,
  is_mvp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Player stats are publicly visible"
ON public.training_player_stats
FOR SELECT
USING (true);

CREATE POLICY "Organizers can manage player stats"
ON public.training_player_stats
FOR ALL
USING (
  auth.uid()::text IN (
    SELECT t.organizer_id
    FROM public.trainings t
    WHERE t.id = (
      SELECT tm.training_id
      FROM public.training_matches tm
      WHERE tm.id = training_player_stats.match_id
    )
  )
)
WITH CHECK (
  auth.uid()::text IN (
    SELECT t.organizer_id
    FROM public.trainings t
    WHERE t.id = (
      SELECT tm.training_id
      FROM public.training_matches tm
      WHERE tm.id = training_player_stats.match_id
    )
  )
);