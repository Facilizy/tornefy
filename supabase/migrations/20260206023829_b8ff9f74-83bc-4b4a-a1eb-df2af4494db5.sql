CREATE OR REPLACE FUNCTION public.apply_rank_points_for_match(_match_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_participation INT := 25;
  v_kill_mult INT := 5;
  v_victory INT := 60;
  v_top23 INT := 20;
  v_top45 INT := 10;
  v_below_top5_penalty INT := 0;
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

      -- Points (Season rules)
      v_points := 0;
      v_points := v_points + v_participation; -- participation
      v_points := v_points + (v_kills * v_kill_mult);

      -- Placement (exclusive): win OR top2-3 OR top4-5
      IF ts.position = 1 THEN
        v_points := v_points + v_victory;
      ELSIF ts.position > 1 AND ts.position <= 3 THEN
        v_points := v_points + v_top23;
      ELSIF ts.position > 3 AND ts.position <= 5 THEN
        v_points := v_points + v_top45;
      END IF;

      -- Below top 5: -2 per position after 5th, capped at -10 (last is always -10)
      v_below_top5_penalty := 0;
      IF ts.position > 5 THEN
        v_below_top5_penalty := -LEAST(10, (ts.position - 5) * 2);
      END IF;
      IF v_last_pos IS NOT NULL AND ts.position = v_last_pos AND ts.position > 0 THEN
        v_below_top5_penalty := -10;
      END IF;
      v_points := v_points + v_below_top5_penalty;

      -- Zero kills penalty
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
          'participation', v_participation,
          'kills', v_kills,
          'kill_points', v_kills * v_kill_mult,
          'position', ts.position,
          'position_points', jsonb_build_object(
            'victory', CASE WHEN ts.position = 1 THEN v_victory ELSE 0 END,
            'top2_3', CASE WHEN ts.position > 1 AND ts.position <= 3 THEN v_top23 ELSE 0 END,
            'top4_5', CASE WHEN ts.position > 3 AND ts.position <= 5 THEN v_top45 ELSE 0 END,
            'below_top5', v_below_top5_penalty,
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
$function$;