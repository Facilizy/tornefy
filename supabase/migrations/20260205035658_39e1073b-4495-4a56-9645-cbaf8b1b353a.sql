-- Expand training_event_logs to cover training changes, waitlist, check-ins, matches and scores (simple summary)

-- 0) Ensure RLS is enabled and visibility is restricted to organizer/admin
ALTER TABLE public.training_event_logs ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policies (names may vary across previous migrations)
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;

DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;

DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;

DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;

-- Also drop earlier organizer-only select policy if it exists (we'll recreate with admin access)
DROP POLICY IF EXISTS "Organizers can view logs for their trainings" ON public.training_event_logs;
DROP POLICY IF EXISTS "Organizers can view their training logs" ON public.training_event_logs;

-- Create organizer/admin SELECT policy
CREATE POLICY "Organizers/admins can view logs"
ON public.training_event_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id::text = training_event_logs.training_id::text
      AND t.organizer_id::text = auth.uid()::text
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Insert policy: allow system/triggers to insert
DROP POLICY IF EXISTS "System can insert event logs" ON public.training_event_logs;
DROP POLICY IF EXISTS "Organizers can insert event logs" ON public.training_event_logs;
CREATE POLICY "System can insert event logs"
ON public.training_event_logs
FOR INSERT
TO authenticated
WITH CHECK (true);


-- 1) Helper to insert log with consistent shape
CREATE OR REPLACE FUNCTION public._insert_training_event_log(
  _training_id text,
  _team_id text,
  _action jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team RECORD;
BEGIN
  IF _team_id IS NOT NULL THEN
    SELECT name, tag INTO v_team
    FROM public.teams
    WHERE id::text = _team_id
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
    COALESCE(v_team.name, 'Equipe'),
    COALESCE(v_team.tag, '—'),
    _action::text,
    now()::text
  );
END;
$$;


-- 2) Training changes (name, datetime, status, max_slots, mode, rules, links, colors)
CREATE OR REPLACE FUNCTION public.trg_trainings_audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
BEGIN
  v_actor := auth.uid()::text;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.name,'') <> COALESCE(OLD.name,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_name_changed',
      'summary', 'Nome do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.datetime,'') <> COALESCE(OLD.datetime,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_datetime_changed',
      'summary', 'Data/hora do treino alterada',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.status,'') <> COALESCE(OLD.status,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_status_changed',
      'summary', 'Status do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.max_slots,0) <> COALESCE(OLD.max_slots,0) THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_max_slots_changed',
      'summary', 'Número de slots alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.mode,'') <> COALESCE(OLD.mode,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_mode_changed',
      'summary', 'Modo do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.rules,'') <> COALESCE(OLD.rules,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_rules_changed',
      'summary', 'Regras do treino alteradas',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.discord_link,'') <> COALESCE(OLD.discord_link,'') OR COALESCE(NEW.whatsapp_link,'') <> COALESCE(OLD.whatsapp_link,'') OR COALESCE(NEW.live_link,'') <> COALESCE(OLD.live_link,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_links_changed',
      'summary', 'Links do treino atualizados',
      'actor_id', v_actor
    ));
  END IF;

  IF COALESCE(NEW.primary_color,'') <> COALESCE(OLD.primary_color,'') OR COALESCE(NEW.secondary_color,'') <> COALESCE(OLD.secondary_color,'') THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_colors_changed',
      'summary', 'Cores do treino atualizadas',
      'actor_id', v_actor
    ));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trainings_audit_changes ON public.trainings;
CREATE TRIGGER trg_trainings_audit_changes
AFTER UPDATE ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION public.trg_trainings_audit_changes();


-- 3) Waitlist events
CREATE OR REPLACE FUNCTION public.trg_training_waitlist_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
BEGIN
  v_actor := auth.uid()::text;

  IF TG_OP = 'INSERT' THEN
    PERFORM public._insert_training_event_log(NEW.training_id::text, NEW.team_id::text, jsonb_build_object(
      'type','waitlist_joined',
      'summary','Entrou na fila de espera',
      'actor_id', v_actor
    ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public._insert_training_event_log(OLD.training_id::text, OLD.team_id::text, jsonb_build_object(
      'type','waitlist_left',
      'summary','Saiu da fila de espera',
      'actor_id', v_actor
    ));
    RETURN OLD;
  ELSE
    IF COALESCE(NEW.status,'') <> COALESCE(OLD.status,'') THEN
      PERFORM public._insert_training_event_log(NEW.training_id::text, NEW.team_id::text, jsonb_build_object(
        'type','waitlist_status_changed',
        'summary','Status da fila de espera alterado',
        'actor_id', v_actor
      ));
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_waitlist_audit_ins ON public.training_waitlist;
DROP TRIGGER IF EXISTS trg_training_waitlist_audit_upd ON public.training_waitlist;
DROP TRIGGER IF EXISTS trg_training_waitlist_audit_del ON public.training_waitlist;

CREATE TRIGGER trg_training_waitlist_audit_ins
AFTER INSERT ON public.training_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_waitlist_audit();

CREATE TRIGGER trg_training_waitlist_audit_upd
AFTER UPDATE ON public.training_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_waitlist_audit();

CREATE TRIGGER trg_training_waitlist_audit_del
AFTER DELETE ON public.training_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_waitlist_audit();


-- 4) Check-in events
CREATE OR REPLACE FUNCTION public.trg_training_checkins_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
BEGIN
  v_actor := auth.uid()::text;

  IF TG_OP = 'INSERT' THEN
    PERFORM public._insert_training_event_log(NEW.training_id::text, NEW.team_id::text, jsonb_build_object(
      'type','checkin',
      'summary','Check-in realizado',
      'actor_id', v_actor
    ));
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_checkins_audit_ins ON public.training_checkins;
CREATE TRIGGER trg_training_checkins_audit_ins
AFTER INSERT ON public.training_checkins
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_checkins_audit();


-- 5) Matches events
CREATE OR REPLACE FUNCTION public.trg_training_matches_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_training_id text;
BEGIN
  v_actor := auth.uid()::text;

  IF TG_OP = 'INSERT' THEN
    v_training_id := NEW.training_id::text;
    PERFORM public._insert_training_event_log(v_training_id, NULL, jsonb_build_object(
      'type','match_created',
      'summary','Partida criada',
      'actor_id', v_actor
    ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_training_id := OLD.training_id::text;
    PERFORM public._insert_training_event_log(v_training_id, NULL, jsonb_build_object(
      'type','match_deleted',
      'summary','Partida removida',
      'actor_id', v_actor
    ));
    RETURN OLD;
  ELSE
    v_training_id := NEW.training_id::text;
    PERFORM public._insert_training_event_log(v_training_id, NULL, jsonb_build_object(
      'type','match_updated',
      'summary','Partida atualizada',
      'actor_id', v_actor
    ));
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_matches_audit_ins ON public.training_matches;
DROP TRIGGER IF EXISTS trg_training_matches_audit_upd ON public.training_matches;
DROP TRIGGER IF EXISTS trg_training_matches_audit_del ON public.training_matches;

CREATE TRIGGER trg_training_matches_audit_ins
AFTER INSERT ON public.training_matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_matches_audit();

CREATE TRIGGER trg_training_matches_audit_upd
AFTER UPDATE ON public.training_matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_matches_audit();

CREATE TRIGGER trg_training_matches_audit_del
AFTER DELETE ON public.training_matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_matches_audit();


-- 6) Scores events
CREATE OR REPLACE FUNCTION public.trg_training_match_scores_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_match RECORD;
  v_training_id text;
BEGIN
  v_actor := auth.uid()::text;

  IF TG_OP = 'INSERT' THEN
    SELECT training_id INTO v_match FROM public.training_matches WHERE id::text = NEW.match_id::text;
    v_training_id := COALESCE(v_match.training_id::text, NULL);

    IF v_training_id IS NOT NULL THEN
      PERFORM public._insert_training_event_log(v_training_id, NEW.team_id::text, jsonb_build_object(
        'type','score_saved',
        'summary','Pontuação registrada/atualizada',
        'actor_id', v_actor
      ));
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT training_id INTO v_match FROM public.training_matches WHERE id::text = OLD.match_id::text;
    v_training_id := COALESCE(v_match.training_id::text, NULL);

    IF v_training_id IS NOT NULL THEN
      PERFORM public._insert_training_event_log(v_training_id, OLD.team_id::text, jsonb_build_object(
        'type','score_deleted',
        'summary','Pontuação removida',
        'actor_id', v_actor
      ));
    END IF;

    RETURN OLD;
  ELSE
    SELECT training_id INTO v_match FROM public.training_matches WHERE id::text = NEW.match_id::text;
    v_training_id := COALESCE(v_match.training_id::text, NULL);

    IF v_training_id IS NOT NULL THEN
      PERFORM public._insert_training_event_log(v_training_id, NEW.team_id::text, jsonb_build_object(
        'type','score_saved',
        'summary','Pontuação registrada/atualizada',
        'actor_id', v_actor
      ));
    END IF;

    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_match_scores_audit_ins ON public.training_match_scores;
DROP TRIGGER IF EXISTS trg_training_match_scores_audit_upd ON public.training_match_scores;
DROP TRIGGER IF EXISTS trg_training_match_scores_audit_del ON public.training_match_scores;

CREATE TRIGGER trg_training_match_scores_audit_ins
AFTER INSERT ON public.training_match_scores
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_match_scores_audit();

CREATE TRIGGER trg_training_match_scores_audit_upd
AFTER UPDATE ON public.training_match_scores
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_match_scores_audit();

CREATE TRIGGER trg_training_match_scores_audit_del
AFTER DELETE ON public.training_match_scores
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_match_scores_audit();
