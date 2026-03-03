-- Fix: audit/log functions were writing timestamp columns as TEXT, breaking inserts (e.g., creating a match)

-- 1) Core helper: always let defaults handle id/created_at, and store action as text (json serialized)
CREATE OR REPLACE FUNCTION public._insert_training_event_log(
  _training_id text,
  _action jsonb,
  _team_id text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    training_id,
    team_id,
    team_name,
    team_tag,
    action
  )
  VALUES (
    _training_id,
    _team_id,
    COALESCE(v_team_name, 'Equipe'),
    COALESCE(v_team_tag, '—'),
    _action::text
  );
END;
$$;

-- 1b) Back-compat overload (older arg order)
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
BEGIN
  -- Delegate to canonical function
  PERFORM public._insert_training_event_log(_training_id, _action, _team_id);
END;
$$;

-- 2) Triggers: remove any implicit TEXT timestamps by relying on helper
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
    PERFORM public._insert_training_event_log(
      v_training_id,
      jsonb_build_object('type','match_created','summary','Partida criada','actor_id', v_actor),
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_training_id := OLD.training_id::text;
    PERFORM public._insert_training_event_log(
      v_training_id,
      jsonb_build_object('type','match_deleted','summary','Partida removida','actor_id', v_actor),
      NULL
    );
    RETURN OLD;
  ELSE
    v_training_id := NEW.training_id::text;
    PERFORM public._insert_training_event_log(
      v_training_id,
      jsonb_build_object('type','match_updated','summary','Partida atualizada','actor_id', v_actor),
      NULL
    );
    RETURN NEW;
  END IF;
END;
$$;

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
      PERFORM public._insert_training_event_log(
        v_training_id,
        jsonb_build_object('type','score_saved','summary','Pontuação registrada/atualizada','actor_id', v_actor),
        NEW.team_id::text
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT training_id INTO v_match FROM public.training_matches WHERE id::text = OLD.match_id::text;
    v_training_id := COALESCE(v_match.training_id::text, NULL);

    IF v_training_id IS NOT NULL THEN
      PERFORM public._insert_training_event_log(
        v_training_id,
        jsonb_build_object('type','score_deleted','summary','Pontuação removida','actor_id', v_actor),
        OLD.team_id::text
      );
    END IF;

    RETURN OLD;
  ELSE
    SELECT training_id INTO v_match FROM public.training_matches WHERE id::text = NEW.match_id::text;
    v_training_id := COALESCE(v_match.training_id::text, NULL);

    IF v_training_id IS NOT NULL THEN
      PERFORM public._insert_training_event_log(
        v_training_id,
        jsonb_build_object('type','score_saved','summary','Pontuação registrada/atualizada','actor_id', v_actor),
        NEW.team_id::text
      );
    END IF;

    RETURN NEW;
  END IF;
END;
$$;

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
    PERFORM public._insert_training_event_log(
      NEW.training_id::text,
      jsonb_build_object('type','checkin','summary','Check-in realizado','actor_id', v_actor),
      NEW.team_id::text
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Registration audit: fix notifications.created_at type and stop forcing text timestamps
CREATE OR REPLACE FUNCTION public.trg_training_registrations_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_training RECORD;
  v_team RECORD;
  v_actor TEXT;
  v_action_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  v_actor := auth.uid()::text;

  IF (TG_OP = 'INSERT') THEN
    SELECT id, name, organizer_id INTO v_training
    FROM public.trainings
    WHERE id = NEW.training_id;

    SELECT id, name, tag INTO v_team
    FROM public.teams
    WHERE id = NEW.team_id;

    v_action_type := 'joined';

    PERFORM public._insert_training_event_log(
      NEW.training_id,
      jsonb_build_object('type', v_action_type, 'actor_id', v_actor),
      NEW.team_id
    );

    IF v_training.organizer_id IS NOT NULL THEN
      v_title := 'Nova inscrição no treino';
      v_message := COALESCE(v_team.name, 'Equipe') || ' [' || COALESCE(v_team.tag, '—') || '] se inscreveu em ' || COALESCE(v_training.name, 'seu treino') || '.';

      INSERT INTO public.notifications (id, user_id, title, message, type, related_id, read, created_at)
      VALUES (
        gen_random_uuid()::text,
        v_training.organizer_id,
        v_title,
        v_message,
        'team_registration',
        NEW.training_id,
        false,
        now()
      );
    END IF;

    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    SELECT id, name, organizer_id INTO v_training
    FROM public.trainings
    WHERE id = OLD.training_id;

    SELECT id, name, tag INTO v_team
    FROM public.teams
    WHERE id = OLD.team_id;

    IF v_training.organizer_id IS NOT NULL AND v_actor IS NOT NULL AND v_actor = v_training.organizer_id THEN
      v_action_type := 'removed';
    ELSE
      v_action_type := 'left';
    END IF;

    PERFORM public._insert_training_event_log(
      OLD.training_id,
      jsonb_build_object('type', v_action_type, 'actor_id', v_actor),
      OLD.team_id
    );

    IF v_training.organizer_id IS NOT NULL THEN
      IF v_action_type = 'removed' THEN
        v_title := 'Equipe removida do treino';
        v_message := COALESCE(v_team.name, 'Equipe') || ' [' || COALESCE(v_team.tag, '—') || '] foi removida de ' || COALESCE(v_training.name, 'seu treino') || '.';
      ELSE
        v_title := 'Equipe saiu do treino';
        v_message := COALESCE(v_team.name, 'Equipe') || ' [' || COALESCE(v_team.tag, '—') || '] saiu de ' || COALESCE(v_training.name, 'seu treino') || '.';
      END IF;

      INSERT INTO public.notifications (id, user_id, title, message, type, related_id, read, created_at)
      VALUES (
        gen_random_uuid()::text,
        v_training.organizer_id,
        v_title,
        v_message,
        CASE WHEN v_action_type = 'removed' THEN 'team_removed' ELSE 'team_unregistration' END,
        OLD.training_id,
        false,
        now()
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 4) Q&A notify: ensure notifications.created_at is timestamptz
CREATE OR REPLACE FUNCTION public.trg_training_questions_notify_organizer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_training RECORD;
  v_author RECORD;
  v_title TEXT;
  v_message TEXT;
BEGIN
  SELECT id, name, organizer_id
    INTO v_training
  FROM public.trainings
  WHERE id = NEW.training_id;

  IF v_training.organizer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND v_training.organizer_id = auth.uid()::text THEN
    RETURN NEW;
  END IF;

  SELECT id, COALESCE(full_name, username, 'Usuário') AS display_name
    INTO v_author
  FROM public.profiles
  WHERE id = NEW.author_id;

  v_title := 'Nova pergunta no treino';
  v_message := COALESCE(v_author.display_name, 'Usuário') || ' perguntou em ' || COALESCE(v_training.name, 'seu treino') || '.';

  INSERT INTO public.notifications (id, user_id, title, message, type, related_id, read, created_at)
  VALUES (
    gen_random_uuid()::text,
    v_training.organizer_id,
    v_title,
    v_message,
    'training_question',
    NEW.training_id,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

-- 5) Team invite accept: ensure team_invites.updated_at is timestamp and not text
CREATE OR REPLACE FUNCTION public.accept_team_invite(_invite_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid text;
  v_invite record;
  v_profile record;
  v_now timestamptz := now();
  v_member_function text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = _invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF v_invite.is_external = 'true' THEN
    RAISE EXCEPTION 'external_invite_cannot_be_accepted';
  END IF;

  IF v_invite.invited_user_id IS NULL OR v_invite.invited_user_id <> v_uid THEN
    RAISE EXCEPTION 'not_invited_user';
  END IF;

  IF v_invite.status IS NOT NULL AND v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'invite_not_pending';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < v_now THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_id = v_uid) THEN
    RAISE EXCEPTION 'user_already_has_team';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  v_member_function := CASE WHEN v_invite.permission = 'admin' THEN 'CAPITÃO' ELSE 'SUPORTE' END;

  UPDATE public.team_invites
  SET status = 'accepted', updated_at = v_now
  WHERE id = _invite_id;

  INSERT INTO public.team_members (team_id, user_id, player_name, game_id, discord, function)
  VALUES (
    v_invite.team_id,
    v_uid,
    COALESCE(v_profile.full_name, v_profile.username, 'Jogador'),
    v_uid,
    COALESCE(v_profile.discord_contact, ''),
    v_member_function
  );

  RETURN json_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('ok', true, 'warning', 'already_member');
END;
$$;
