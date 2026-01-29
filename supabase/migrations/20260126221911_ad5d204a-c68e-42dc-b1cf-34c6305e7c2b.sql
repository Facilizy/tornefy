-- Fix vw_tornefy_ranking to provide 3 aggregation levels:
-- 1) Geral do treino (queda_id NULL, rodada_id NULL)
-- 2) Por rodada (queda_id NULL, rodada_id = round_id)
-- 3) Por queda/partida (queda_id = match_id, rodada_id = round_id)

CREATE OR REPLACE VIEW public.vw_tornefy_ranking
WITH (security_invoker = on) AS
WITH base AS (
  SELECT
    t.id::text AS treino_id,
    m.id::text AS match_id,
    m.round_id::text AS rodada_id,

    te.name AS team_name,
    te.tag AS team_tag,
    te.logo_url AS team_logo,

    COALESCE(ms.total_points, 0)::int AS points,
    COALESCE(ms.kills, 0)::int AS kills,
    COALESCE(ms.position, 0)::int AS position
  FROM public.training_match_scores ms
  JOIN public.training_matches m
    ON m.id = ms.match_id
  JOIN public.trainings t
    ON t.id = m.training_id
  LEFT JOIN public.teams te
    ON te.id = ms.team_id
), agg_overall AS (
  SELECT
    treino_id,
    NULL::text AS queda_id,
    NULL::text AS rodada_id,
    team_name,
    team_tag,
    team_logo,
    SUM(points)::int AS points,
    SUM(kills)::int AS kills,
    COUNT(DISTINCT match_id)::int AS matches_played,
    SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END)::int AS wins
  FROM base
  GROUP BY treino_id, team_name, team_tag, team_logo
), agg_round AS (
  SELECT
    treino_id,
    NULL::text AS queda_id,
    rodada_id,
    team_name,
    team_tag,
    team_logo,
    SUM(points)::int AS points,
    SUM(kills)::int AS kills,
    COUNT(DISTINCT match_id)::int AS matches_played,
    SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END)::int AS wins
  FROM base
  GROUP BY treino_id, rodada_id, team_name, team_tag, team_logo
), agg_match AS (
  SELECT
    treino_id,
    match_id AS queda_id,
    rodada_id,
    team_name,
    team_tag,
    team_logo,
    SUM(points)::int AS points,
    SUM(kills)::int AS kills,
    COUNT(DISTINCT match_id)::int AS matches_played,
    SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END)::int AS wins
  FROM base
  GROUP BY treino_id, match_id, rodada_id, team_name, team_tag, team_logo
), agg_all AS (
  SELECT * FROM agg_overall
  UNION ALL
  SELECT * FROM agg_round
  UNION ALL
  SELECT * FROM agg_match
)
SELECT
  treino_id,
  queda_id,
  rodada_id,
  team_name,
  team_tag,
  team_logo,
  points,
  kills,
  matches_played,
  wins,
  DENSE_RANK() OVER (
    PARTITION BY treino_id, queda_id, rodada_id
    ORDER BY points DESC, kills DESC, team_name ASC
  )::int AS rank,
  (DENSE_RANK() OVER (
    PARTITION BY treino_id, queda_id, rodada_id
    ORDER BY points DESC, kills DESC, team_name ASC
  ) = 1) AS is_mvp
FROM agg_all;
