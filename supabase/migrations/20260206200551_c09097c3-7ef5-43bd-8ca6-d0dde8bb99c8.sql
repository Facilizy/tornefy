-- Tournament scrim extensions (text IDs): event logs + simple scoreboard

-- 1) Event logs for tournaments
CREATE TABLE IF NOT EXISTS public.tournament_event_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id TEXT NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL DEFAULT '',
  team_tag TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament logs view organizer or team owners" ON public.tournament_event_logs;
DROP POLICY IF EXISTS "Tournament logs insert organizer or team owner" ON public.tournament_event_logs;

CREATE POLICY "Tournament logs view organizer or team owners"
ON public.tournament_event_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_event_logs.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
    FROM public.tournament_registrations tr
    JOIN public.teams te ON te.id = tr.team_id
    WHERE tr.tournament_id = tournament_event_logs.tournament_id
      AND te.owner_id = auth.uid()::text
  )
);

CREATE POLICY "Tournament logs insert organizer or team owner"
ON public.tournament_event_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_event_logs.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
  OR (
    tournament_event_logs.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.teams te
      WHERE te.id = tournament_event_logs.team_id
        AND te.owner_id = auth.uid()::text
    )
  )
);

-- 2) Simple scoreboard totals for tournaments
CREATE TABLE IF NOT EXISTS public.tournament_team_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);

ALTER TABLE public.tournament_team_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tournament scores view organizer or team owner" ON public.tournament_team_scores;
DROP POLICY IF EXISTS "Tournament scores insert organizer" ON public.tournament_team_scores;
DROP POLICY IF EXISTS "Tournament scores update organizer" ON public.tournament_team_scores;

CREATE POLICY "Tournament scores view organizer or team owner"
ON public.tournament_team_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_team_scores.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM public.teams te
    WHERE te.id = tournament_team_scores.team_id
      AND te.owner_id = auth.uid()::text
  )
);

CREATE POLICY "Tournament scores insert organizer"
ON public.tournament_team_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_team_scores.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
);

CREATE POLICY "Tournament scores update organizer"
ON public.tournament_team_scores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_team_scores.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_team_scores.tournament_id
      AND t.organizer_id = auth.uid()::text
  )
);
