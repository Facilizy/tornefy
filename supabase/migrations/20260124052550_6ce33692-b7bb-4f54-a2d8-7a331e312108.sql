-- Fix: team_members.user_id is TEXT, so compare with _user_id::text

CREATE OR REPLACE FUNCTION public.get_public_player_stats(_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH member_ids AS (
    SELECT id
    FROM public.team_members
    WHERE user_id = _user_id::text
  ), agg AS (
    SELECT
      COUNT(DISTINCT s.match_id)::int AS scrims,
      COALESCE(SUM(s.kills), 0)::int AS kills,
      COALESCE(SUM(CASE WHEN s.is_mvp THEN 1 ELSE 0 END), 0)::int AS mvps
    FROM public.training_player_stats s
    JOIN member_ids m ON m.id = s.team_member_id
    WHERE s.match_id IS NOT NULL
  )
  SELECT json_build_object(
    'user_id', _user_id,
    'scrims', COALESCE((SELECT scrims FROM agg), 0),
    'kills',  COALESCE((SELECT kills  FROM agg), 0),
    'mvps',   COALESCE((SELECT mvps   FROM agg), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_player_stats(uuid) TO anon, authenticated;
