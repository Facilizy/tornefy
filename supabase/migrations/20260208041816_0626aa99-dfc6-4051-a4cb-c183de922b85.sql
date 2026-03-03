-- A) Fix: _insert_training_event_log should never access unassigned record

CREATE OR REPLACE FUNCTION public._insert_training_event_log(_training_id text, _team_id text, _action jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_name text := null;
  v_team_tag  text := null;
BEGIN
  IF _team_id IS NOT NULL THEN
    SELECT t.name, t.tag
      INTO v_team_name, v_team_tag
    FROM public.teams t
    WHERE t.id::text = _team_id
    LIMIT 1;
  END IF;

  INSERT INTO public.training_event_logs (
    id,
    training_id,
    team_id,
    team_name,
    team_tag,
    action,
    created_at
  )
  VALUES (
    gen_random_uuid()::text,
    _training_id,
    _team_id,
    COALESCE(v_team_name, 'Equipe'),
    COALESCE(v_team_tag, '—'),
    _action::text,
    now()::text
  );
END;
$function$;

-- Also fix the overloaded signature (keeps compatibility with existing callers)
CREATE OR REPLACE FUNCTION public._insert_training_event_log(_training_id text, _action jsonb, _team_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_name text := null;
  v_team_tag  text := null;
BEGIN
  IF _team_id IS NOT NULL THEN
    SELECT t.name, t.tag
      INTO v_team_name, v_team_tag
    FROM public.teams t
    WHERE t.id::text = _team_id
    LIMIT 1;
  END IF;

  INSERT INTO public.training_event_logs (training_id, team_id, team_name, team_tag, action)
  VALUES (
    _training_id,
    _team_id,
    COALESCE(v_team_name, 'Equipe'),
    COALESCE(v_team_tag, '—'),
    _action::text
  );
END;
$function$;

-- B) RLS: authenticated users can read scrim groups (write stays organizer/admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scrim_groups'
      AND policyname = 'scrim_groups_select_authenticated'
  ) THEN
    CREATE POLICY scrim_groups_select_authenticated
    ON public.scrim_groups
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scrim_group_teams'
      AND policyname = 'scrim_group_teams_select_authenticated'
  ) THEN
    CREATE POLICY scrim_group_teams_select_authenticated
    ON public.scrim_group_teams
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END
$$;

-- C1) Rodadas: salvar filtro de grupos por rodada
ALTER TABLE public.training_rounds
ADD COLUMN IF NOT EXISTS allowed_group_ids text[] NULL;

-- D1) Premiação em TC + texto opcional (usa trainings.prize como texto extra)
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS prize_coins integer NOT NULL DEFAULT 0;
