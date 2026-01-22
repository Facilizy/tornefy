-- Ranking Seasons (player-based)
CREATE TABLE IF NOT EXISTS public.ranking_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_seasons ENABLE ROW LEVEL SECURITY;

-- Public can read seasons
DO $$ BEGIN
  CREATE POLICY "Ranking seasons are publicly visible"
  ON public.ranking_seasons
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: get season id for a given timestamp
CREATE OR REPLACE FUNCTION public.get_ranking_season_id(at_time TIMESTAMPTZ)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.ranking_seasons s
  WHERE at_time >= s.start_at
    AND (s.end_at IS NULL OR at_time < s.end_at)
  ORDER BY s.start_at DESC
  LIMIT 1;
$$;

-- Season 1 bootstrap (required for Season-based ranking)
INSERT INTO public.ranking_seasons (name, start_at, end_at)
SELECT 'Season 1', '2026-03-01T00:00:00Z'::timestamptz, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.ranking_seasons WHERE name = 'Season 1'
);

-- Aggregated points per player/game/season
CREATE TABLE IF NOT EXISTS public.player_season_points (
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  season_id UUID NOT NULL REFERENCES public.ranking_seasons(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id, season_id)
);

ALTER TABLE public.player_season_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Player season points are publicly visible"
  ON public.player_season_points
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit events: one event per player per match (and manual adjustments)
CREATE TABLE IF NOT EXISTS public.player_rank_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  season_id UUID NOT NULL REFERENCES public.ranking_seasons(id) ON DELETE CASCADE,
  training_id TEXT NULL,
  match_id TEXT NULL,
  source TEXT NOT NULL DEFAULT 'match', -- 'match' | 'manual'
  points INT NOT NULL,
  breakdown JSONB NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_rank_events_user_day
  ON public.player_rank_events (user_id, game_id, season_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_player_rank_events_match
  ON public.player_rank_events (user_id, game_id, season_id, match_id)
  WHERE match_id IS NOT NULL;

ALTER TABLE public.player_rank_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own rank events"
  ON public.player_rank_events
  FOR SELECT
  USING ((auth.uid())::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Manual adjustments (penalties) by verified organizers
CREATE TABLE IF NOT EXISTS public.player_rank_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  season_id UUID NOT NULL REFERENCES public.ranking_seasons(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  training_id TEXT NULL,
  match_id TEXT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_rank_adjustments_target
  ON public.player_rank_adjustments (target_user_id, game_id, season_id, created_at);

ALTER TABLE public.player_rank_adjustments ENABLE ROW LEVEL SECURITY;

-- helper condition: organizer_verified
CREATE OR REPLACE FUNCTION public.is_organizer_verified(_user_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'organizer_verified'
  );
$$;

DO $$ BEGIN
  CREATE POLICY "Verified organizers can insert rank adjustments"
  ON public.player_rank_adjustments
  FOR INSERT
  WITH CHECK (public.is_organizer_verified((auth.uid())::text) AND (auth.uid())::text = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own rank adjustments"
  ON public.player_rank_adjustments
  FOR SELECT
  USING ((auth.uid())::text = target_user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Apply an adjustment into the ranking ledger (keeps adjustments immutable, writes events+aggregate)
CREATE OR REPLACE FUNCTION public.apply_rank_adjustment(_adjustment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
BEGIN
  SELECT * INTO a
  FROM public.player_rank_adjustments
  WHERE id = _adjustment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Insert event (dedupe by adjustment id via breakdown field)
  INSERT INTO public.player_rank_events (user_id, game_id, season_id, training_id, match_id, source, points, breakdown, created_by)
  VALUES (
    a.target_user_id,
    a.game_id,
    a.season_id,
    a.training_id,
    a.match_id,
    'manual',
    a.points,
    jsonb_build_object('adjustment_id', a.id, 'reason', a.reason),
    a.created_by
  );

  INSERT INTO public.player_season_points (user_id, game_id, season_id, points)
  VALUES (a.target_user_id, a.game_id, a.season_id, a.points)
  ON CONFLICT (user_id, game_id, season_id)
  DO UPDATE SET
    points = public.player_season_points.points + EXCLUDED.points,
    updated_at = now();
END;
$$;

-- When an adjustment is inserted, apply it.
CREATE OR REPLACE FUNCTION public.trg_apply_rank_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_rank_adjustment(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_rank_adjustment_after_insert ON public.player_rank_adjustments;
CREATE TRIGGER apply_rank_adjustment_after_insert
AFTER INSERT ON public.player_rank_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.trg_apply_rank_adjustment();

-- Compute and apply ranking points for a completed match
CREATE OR REPLACE FUNCTION public.apply_rank_points_for_match(_match_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_training_id TEXT;
  v_organizer_id TEXT;
  v_game_id TEXT;
  v_event_time TIMESTAMPTZ;
  v_season_id UUID;
  v_last_pos INT;
  v_daily_limit INT := 8;
  ts RECORD;
  p RECORD;
  v_kills INT;
  v_points INT;
  v_day DATE;
  v_daily_count INT;
BEGIN
  SELECT tm.training_id INTO v_training_id
  FROM public.training_matches tm
  WHERE tm.id = _match_id;

  IF v_training_id IS NULL THEN
    RETURN;
  END IF;

  SELECT t.organizer_id, t.game, COALESCE(t.datetime, now())
    INTO v_organizer_id, v_game_id, v_event_time
  FROM public.trainings t
  WHERE t.id = v_training_id;

  IF v_game_id IS NULL OR v_organizer_id IS NULL THEN
    RETURN;
  END IF;

  -- Only verified organizers count
  IF NOT public.is_organizer_verified(v_organizer_id) THEN
    RETURN;
  END IF;

  v_season_id := public.get_ranking_season_id(v_event_time);
  IF v_season_id IS NULL THEN
    RETURN;
  END IF;

  SELECT max(COALESCE(ms.position, 0))::int
    INTO v_last_pos
  FROM public.training_match_scores ms
  WHERE ms.match_id = _match_id;

  v_day := (v_event_time AT TIME ZONE 'UTC')::date;

  FOR ts IN
    SELECT ms.team_id, COALESCE(ms.position, 0)::int AS position
    FROM public.training_match_scores ms
    WHERE ms.match_id = _match_id
  LOOP
    -- Find players registered for this training/team (via the registered line)
    FOR p IN
      SELECT DISTINCT
        mem.id AS team_member_id,
        mem.user_id AS user_id,
        COALESCE(mem.player_name, '') AS player_name
      FROM public.training_registrations r
      JOIN public.team_members mem
        ON mem.line_id = r.line_id
      WHERE r.training_id = v_training_id
        AND r.team_id = ts.team_id
        AND r.line_id IS NOT NULL
        AND mem.user_id IS NOT NULL
    LOOP
      -- Daily limit: count unique matches already scored today
      SELECT count(*)::int
        INTO v_daily_count
      FROM public.player_rank_events e
      WHERE e.user_id = p.user_id
        AND e.game_id = v_game_id
        AND e.season_id = v_season_id
        AND e.match_id IS NOT NULL
        AND (e.created_at AT TIME ZONE 'UTC')::date = v_day;

      IF v_daily_count >= v_daily_limit THEN
        CONTINUE;
      END IF;

      -- Kills from player stats (default 0)
      SELECT COALESCE(sum(ps.kills), 0)::int
        INTO v_kills
      FROM public.training_player_stats ps
      WHERE ps.match_id = _match_id
        AND ps.team_member_id = p.team_member_id;

      -- Points: rules fixed (Season 1)
      v_points := 0;
      v_points := v_points + 5; -- participation
      v_points := v_points + (v_kills * 2);

      IF ts.position = 1 THEN
        v_points := v_points + 30;
      END IF;
      IF ts.position > 0 AND ts.position <= 3 THEN
        v_points := v_points + 20;
      END IF;
      IF ts.position > 0 AND ts.position <= 5 THEN
        v_points := v_points + 10;
      END IF;

      IF v_last_pos IS NOT NULL AND ts.position = v_last_pos THEN
        v_points := v_points - 10;
      END IF;
      IF v_kills = 0 THEN
        v_points := v_points - 5;
      END IF;

      -- Insert event (dedupe by unique index user/game/season/match)
      INSERT INTO public.player_rank_events (user_id, game_id, season_id, training_id, match_id, source, points, breakdown, created_by, created_at)
      VALUES (
        p.user_id,
        v_game_id,
        v_season_id,
        v_training_id,
        _match_id,
        'match',
        v_points,
        jsonb_build_object(
          'participation', 5,
          'kills', v_kills,
          'kill_points', v_kills * 2,
          'position', ts.position,
          'position_points', jsonb_build_object(
            'win', CASE WHEN ts.position = 1 THEN 30 ELSE 0 END,
            'top3', CASE WHEN ts.position > 0 AND ts.position <= 3 THEN 20 ELSE 0 END,
            'top5', CASE WHEN ts.position > 0 AND ts.position <= 5 THEN 10 ELSE 0 END,
            'last', CASE WHEN v_last_pos IS NOT NULL AND ts.position = v_last_pos THEN -10 ELSE 0 END,
            'zero_kills', CASE WHEN v_kills = 0 THEN -5 ELSE 0 END
          )
        ),
        v_organizer_id,
        v_event_time
      )
      ON CONFLICT (user_id, game_id, season_id, match_id)
      DO NOTHING;

      -- Aggregate upsert
      INSERT INTO public.player_season_points (user_id, game_id, season_id, points)
      VALUES (p.user_id, v_game_id, v_season_id, v_points)
      ON CONFLICT (user_id, game_id, season_id)
      DO UPDATE SET
        points = public.player_season_points.points + EXCLUDED.points,
        updated_at = now();

    END LOOP;
  END LOOP;
END;
$$;

-- Trigger when a match becomes completed
CREATE OR REPLACE FUNCTION public.trg_apply_rank_points_on_match_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.apply_rank_points_for_match(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_rank_points_on_match_completed ON public.training_matches;
CREATE TRIGGER apply_rank_points_on_match_completed
AFTER UPDATE OF status ON public.training_matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_apply_rank_points_on_match_completed();
