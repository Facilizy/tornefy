-- Make created_at reliable (fixes 1969 timestamps in UI)
ALTER TABLE public.training_event_logs
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.training_event_logs
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.training_event_logs
  ALTER COLUMN created_at SET NOT NULL;

-- Restrict visibility: only organizer (existing policy) + admins
DROP POLICY IF EXISTS "Event logs are publicly visible" ON public.training_event_logs;

DO $$
BEGIN
  -- In case this DB doesn't have the helper, fail clearly.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    RAISE EXCEPTION 'Missing function public.has_role(uid, role). Cannot create admin policy safely.';
  END IF;
END$$;

DROP POLICY IF EXISTS "Admins can view logs" ON public.training_event_logs;
CREATE POLICY "Admins can view logs"
ON public.training_event_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Helper to insert event log rows with optional team context
CREATE OR REPLACE FUNCTION public._insert_training_event_log(
  _training_id text,
  _action jsonb,
  _team_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_name text;
  _team_tag text;
BEGIN
  IF _team_id IS NOT NULL THEN
    SELECT name, tag INTO _team_name, _team_tag
    FROM public.teams
    WHERE id::text = _team_id
    LIMIT 1;
  END IF;

  INSERT INTO public.training_event_logs (training_id, team_id, team_name, team_tag, action)
  VALUES (
    _training_id,
    _team_id,
    _team_name,
    _team_tag,
    _action::text
  );
END;
$$;

-- TRAINING updates (settings/changes)
CREATE OR REPLACE FUNCTION public.trg_trainings_audit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
BEGIN
  -- Only log if something relevant changed
  IF (row(NEW.name, NEW.datetime, NEW.status, NEW.max_slots, NEW.mode, NEW.game, NEW.platform, NEW.discord_link, NEW.whatsapp_link, NEW.rules, NEW.important_info, NEW.primary_color, NEW.secondary_color)
      IS DISTINCT FROM
      row(OLD.name, OLD.datetime, OLD.status, OLD.max_slots, OLD.mode, OLD.game, OLD.platform, OLD.discord_link, OLD.whatsapp_link, OLD.rules, OLD.important_info, OLD.primary_color, OLD.secondary_color)) THEN

    msg := 'Treino atualizado';

    PERFORM public._insert_training_event_log(
      NEW.id::text,
      jsonb_build_object(
        'type', 'training_updated',
        'message', msg,
        'actor_id', auth.uid()
      ),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trainings_audit_update ON public.trainings;
CREATE TRIGGER trg_trainings_audit_update
AFTER UPDATE ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION public.trg_trainings_audit_update();

-- WAITLIST events
CREATE OR REPLACE FUNCTION public.trg_training_waitlist_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
  training_id_text text;
  team_id_text text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    msg := 'Entrou na waitlist';
    training_id_text := NEW.training_id::text;
    team_id_text := NEW.team_id::text;

    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','waitlist_joined','message',msg,'actor_id',auth.uid()),
      team_id_text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    msg := 'Saiu da waitlist';
    training_id_text := OLD.training_id::text;
    team_id_text := OLD.team_id::text;

    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','waitlist_left','message',msg,'actor_id',auth.uid()),
      team_id_text
    );
    RETURN OLD;
  ELSE
    -- UPDATE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      msg := 'Status da waitlist atualizado';
      training_id_text := NEW.training_id::text;
      team_id_text := NEW.team_id::text;

      PERFORM public._insert_training_event_log(
        training_id_text,
        jsonb_build_object('type','waitlist_status','message',msg,'status',NEW.status,'actor_id',auth.uid()),
        team_id_text
      );
    END IF;

    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_waitlist_audit ON public.training_waitlist;
CREATE TRIGGER trg_training_waitlist_audit
AFTER INSERT OR UPDATE OR DELETE ON public.training_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_waitlist_audit();

-- CHECKIN events
CREATE OR REPLACE FUNCTION public.trg_training_checkins_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._insert_training_event_log(
    NEW.training_id::text,
    jsonb_build_object('type','checkin','message','Check-in realizado','actor_id',auth.uid()),
    NEW.team_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_checkins_audit ON public.training_checkins;
CREATE TRIGGER trg_training_checkins_audit
AFTER INSERT ON public.training_checkins
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_checkins_audit();

-- MATCH events (create/update)
CREATE OR REPLACE FUNCTION public.trg_training_matches_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  training_id_text text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    training_id_text := NEW.training_id::text;
    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','match_created','message','Partida criada','match_id',NEW.id,'actor_id',auth.uid()),
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    training_id_text := NEW.training_id::text;
    IF (row(NEW.name, NEW.status, NEW.match_number, NEW.match_time, NEW.map_name) IS DISTINCT FROM row(OLD.name, OLD.status, OLD.match_number, OLD.match_time, OLD.map_name)) THEN
      PERFORM public._insert_training_event_log(
        training_id_text,
        jsonb_build_object('type','match_updated','message','Partida atualizada','match_id',NEW.id,'actor_id',auth.uid()),
        NULL
      );
    END IF;
    RETURN NEW;
  ELSE
    training_id_text := OLD.training_id::text;
    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','match_deleted','message','Partida removida','match_id',OLD.id,'actor_id',auth.uid()),
      NULL
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_matches_audit ON public.training_matches;
CREATE TRIGGER trg_training_matches_audit
AFTER INSERT OR UPDATE OR DELETE ON public.training_matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_matches_audit();

-- SCORE events (create/update)
CREATE OR REPLACE FUNCTION public.trg_training_match_scores_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  training_id_text text;
  _match_training_id text;
BEGIN
  -- Resolve training_id from match
  SELECT tm.training_id::text INTO _match_training_id
  FROM public.training_matches tm
  WHERE tm.id::text = COALESCE(NEW.match_id::text, OLD.match_id::text)
  LIMIT 1;

  training_id_text := _match_training_id;

  IF training_id_text IS NULL THEN
    -- If we can't resolve, don't block the write.
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','score_created','message','Pontuação registrada','match_id',NEW.match_id,'actor_id',auth.uid()),
      NEW.team_id::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (row(NEW.total_points, NEW.position, NEW.kills, NEW.kill_points, NEW.position_points, NEW.bonus_points)
        IS DISTINCT FROM
        row(OLD.total_points, OLD.position, OLD.kills, OLD.kill_points, OLD.position_points, OLD.bonus_points)) THEN
      PERFORM public._insert_training_event_log(
        training_id_text,
        jsonb_build_object('type','score_updated','message','Pontuação atualizada','match_id',NEW.match_id,'actor_id',auth.uid()),
        NEW.team_id::text
      );
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public._insert_training_event_log(
      training_id_text,
      jsonb_build_object('type','score_deleted','message','Pontuação removida','match_id',OLD.match_id,'actor_id',auth.uid()),
      OLD.team_id::text
    );
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_match_scores_audit ON public.training_match_scores;
CREATE TRIGGER trg_training_match_scores_audit
AFTER INSERT OR UPDATE OR DELETE ON public.training_match_scores
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_match_scores_audit();
