-- Fix: column alias ambiguity (player_name)
DROP VIEW IF EXISTS public.vw_tornefy_mvp_players;

CREATE VIEW public.vw_tornefy_mvp_players
WITH (security_invoker = on)
AS
WITH base AS (
  SELECT
    tm.training_id::text AS treino_id,
    ps.team_id::text AS team_id,
    COALESCE(mem.user_id::text, NULLIF(ps.player_name, ''), ps.team_member_id::text) AS player_key,
    COALESCE(NULLIF(ps.player_name, ''), NULLIF(p.full_name, ''), NULLIF(p.username, ''), 'Jogador') AS player_display_name,
    mem.user_id::text AS user_id,
    p.avatar_url AS avatar_url,
    COALESCE(t.name, '') AS team_name,
    t.tag AS team_tag,
    t.logo_url AS team_logo,
    COUNT(*) FILTER (WHERE ps.is_mvp IS TRUE)::int AS mvps,
    COALESCE(SUM(ps.kills), 0)::int AS kills
  FROM public.training_player_stats ps
  JOIN public.training_matches tm
    ON tm.id = ps.match_id
  LEFT JOIN public.team_members mem
    ON mem.id = ps.team_member_id
  LEFT JOIN public.profiles p
    ON p.id = mem.user_id::text
  LEFT JOIN public.teams t
    ON t.id = ps.team_id
  GROUP BY
    tm.training_id,
    ps.team_id,
    COALESCE(mem.user_id::text, NULLIF(ps.player_name, ''), ps.team_member_id::text),
    COALESCE(NULLIF(ps.player_name, ''), NULLIF(p.full_name, ''), NULLIF(p.username, ''), 'Jogador'),
    mem.user_id,
    p.avatar_url,
    t.name,
    t.tag,
    t.logo_url
), ranked AS (
  SELECT
    *,
    DENSE_RANK() OVER (
      PARTITION BY treino_id
      ORDER BY mvps DESC, kills DESC, player_display_name ASC
    )::int AS rank
  FROM base
  WHERE mvps > 0
)
SELECT
  treino_id,
  team_id,
  team_name,
  team_tag,
  team_logo,
  player_key,
  player_display_name AS player_name,
  user_id,
  avatar_url,
  mvps,
  kills,
  rank
FROM ranked;

GRANT SELECT ON public.vw_tornefy_mvp_players TO anon;
GRANT SELECT ON public.vw_tornefy_mvp_players TO authenticated;
