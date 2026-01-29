DROP VIEW IF EXISTS public.vw_tornefy_ranking;

CREATE VIEW public.vw_tornefy_ranking
WITH (security_invoker=on)
AS
WITH
  teams_base AS (
    SELECT
      t.id AS team_id,
      COALESCE(t.name, '') AS team_name,
      t.tag AS team_tag,
      COALESCE(t.logo_url, '') AS team_logo
    FROM public.teams t
    WHERE t.deleted_at IS NULL
  ),

  queda_scores AS (
    SELECT
      m.training_id AS treino_id,
      m.round_id AS rodada_id,
      s.match_id AS queda_id,
      s.team_id,
      COALESCE(SUM(s.total_points), 0)::int AS points,
      COALESCE(SUM(s.kills), 0)::int AS kills,
      COUNT(DISTINCT s.match_id)::int AS matches_played,
      COALESCE(SUM(CASE WHEN s.position = 1 THEN 1 ELSE 0 END), 0)::int AS wins
    FROM public.training_match_scores s
    JOIN public.training_matches m ON m.id = s.match_id
    GROUP BY m.training_id, m.round_id, s.match_id, s.team_id
  ),

  rodada_scores AS (
    SELECT
      m.training_id AS treino_id,
      m.round_id AS rodada_id,
      NULL::text AS queda_id,
      s.team_id,
      COALESCE(SUM(s.total_points), 0)::int AS points,
      COALESCE(SUM(s.kills), 0)::int AS kills,
      COUNT(DISTINCT s.match_id)::int AS matches_played,
      COALESCE(SUM(CASE WHEN s.position = 1 THEN 1 ELSE 0 END), 0)::int AS wins
    FROM public.training_match_scores s
    JOIN public.training_matches m ON m.id = s.match_id
    GROUP BY m.training_id, m.round_id, s.team_id
  ),

  geral_scores AS (
    SELECT
      m.training_id AS treino_id,
      NULL::text AS rodada_id,
      NULL::text AS queda_id,
      s.team_id,
      COALESCE(SUM(s.total_points), 0)::int AS points,
      COALESCE(SUM(s.kills), 0)::int AS kills,
      COUNT(DISTINCT s.match_id)::int AS matches_played,
      COALESCE(SUM(CASE WHEN s.position = 1 THEN 1 ELSE 0 END), 0)::int AS wins
    FROM public.training_match_scores s
    JOIN public.training_matches m ON m.id = s.match_id
    GROUP BY m.training_id, s.team_id
  ),

  queda_mvp AS (
    SELECT
      m.training_id AS treino_id,
      m.round_id AS rodada_id,
      ps.match_id AS queda_id,
      ps.team_id,
      ps.player_name AS mvp_player_name,
      COALESCE(SUM(ps.kills), 0)::int AS mvp_player_kills,
      ROW_NUMBER() OVER (
        PARTITION BY m.training_id, m.round_id, ps.match_id
        ORDER BY COALESCE(SUM(ps.kills), 0) DESC, ps.player_name ASC
      ) AS rn
    FROM public.training_player_stats ps
    JOIN public.training_matches m ON m.id = ps.match_id
    WHERE ps.is_mvp IS TRUE
    GROUP BY m.training_id, m.round_id, ps.match_id, ps.team_id, ps.player_name
  ),

  rodada_mvp AS (
    SELECT
      m.training_id AS treino_id,
      m.round_id AS rodada_id,
      NULL::text AS queda_id,
      ps.team_id,
      ps.player_name AS mvp_player_name,
      COALESCE(SUM(ps.kills), 0)::int AS mvp_player_kills,
      ROW_NUMBER() OVER (
        PARTITION BY m.training_id, m.round_id
        ORDER BY COALESCE(SUM(ps.kills), 0) DESC, ps.player_name ASC
      ) AS rn
    FROM public.training_player_stats ps
    JOIN public.training_matches m ON m.id = ps.match_id
    WHERE ps.is_mvp IS TRUE
    GROUP BY m.training_id, m.round_id, ps.team_id, ps.player_name
  ),

  geral_mvp AS (
    SELECT
      m.training_id AS treino_id,
      NULL::text AS rodada_id,
      NULL::text AS queda_id,
      ps.team_id,
      ps.player_name AS mvp_player_name,
      COALESCE(SUM(ps.kills), 0)::int AS mvp_player_kills,
      ROW_NUMBER() OVER (
        PARTITION BY m.training_id
        ORDER BY COALESCE(SUM(ps.kills), 0) DESC, ps.player_name ASC
      ) AS rn
    FROM public.training_player_stats ps
    JOIN public.training_matches m ON m.id = ps.match_id
    WHERE ps.is_mvp IS TRUE
    GROUP BY m.training_id, ps.team_id, ps.player_name
  ),

  all_scores AS (
    SELECT * FROM geral_scores
    UNION ALL
    SELECT * FROM rodada_scores
    UNION ALL
    SELECT * FROM queda_scores
  ),

  all_mvp AS (
    SELECT treino_id, rodada_id, queda_id, team_id, mvp_player_name, mvp_player_kills
    FROM geral_mvp
    WHERE rn = 1
    UNION ALL
    SELECT treino_id, rodada_id, queda_id, team_id, mvp_player_name, mvp_player_kills
    FROM rodada_mvp
    WHERE rn = 1
    UNION ALL
    SELECT treino_id, rodada_id, queda_id, team_id, mvp_player_name, mvp_player_kills
    FROM queda_mvp
    WHERE rn = 1
  )

SELECT
  s.treino_id,
  s.rodada_id,
  s.queda_id,
  tb.team_name,
  tb.team_tag,
  NULLIF(tb.team_logo, '') AS team_logo,
  s.points,
  s.kills,
  s.matches_played,
  s.wins,
  DENSE_RANK() OVER (
    PARTITION BY s.treino_id, s.rodada_id, s.queda_id
    ORDER BY s.points DESC, s.kills DESC, tb.team_name ASC
  )::int AS rank,
  (m.team_id IS NOT NULL AND m.team_id = s.team_id) AS is_mvp,
  CASE WHEN m.team_id = s.team_id THEN m.mvp_player_name ELSE NULL END AS mvp_player_name,
  CASE WHEN m.team_id = s.team_id THEN m.mvp_player_kills ELSE NULL END AS mvp_player_kills
FROM all_scores s
JOIN teams_base tb ON tb.team_id = s.team_id
LEFT JOIN all_mvp m
  ON m.treino_id = s.treino_id
  AND (m.rodada_id IS NOT DISTINCT FROM s.rodada_id)
  AND (m.queda_id IS NOT DISTINCT FROM s.queda_id)
;

GRANT SELECT ON public.vw_tornefy_ranking TO anon;
GRANT SELECT ON public.vw_tornefy_ranking TO authenticated;
