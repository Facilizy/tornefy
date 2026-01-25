-- Normalize legacy string 'null' to actual NULL and backfill
UPDATE public.training_player_stats
SET team_member_id = NULL
WHERE team_member_id IN ('null', '');

WITH candidates AS (
  SELECT
    s.id AS stat_id,
    (
      SELECT tm.id
      FROM public.team_members tm
      WHERE tm.team_id = s.team_id
        AND tm.player_name = s.player_name
        AND tm.user_id IS NOT NULL
        AND tm.id IS NOT NULL
      LIMIT 1
    ) AS member_id
  FROM public.training_player_stats s
  WHERE s.team_member_id IS NULL
)
UPDATE public.training_player_stats s
SET team_member_id = c.member_id
FROM candidates c
WHERE s.id = c.stat_id
  AND c.member_id IS NOT NULL;