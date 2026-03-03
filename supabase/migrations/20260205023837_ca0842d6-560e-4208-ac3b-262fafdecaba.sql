-- Audit + notifications for training registrations (join/leave/remove)

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

    INSERT INTO public.training_event_logs (id, training_id, team_id, team_name, team_tag, action, created_at)
    VALUES (
      gen_random_uuid()::text,
      NEW.training_id,
      NEW.team_id,
      COALESCE(v_team.name, 'Equipe'),
      COALESCE(v_team.tag, '—'),
      jsonb_build_object('type', v_action_type, 'actor_id', v_actor)::text,
      now()::text
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
        now()::text
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

    -- If the organizer performed the delete, treat as 'removed', else 'left'
    IF v_training.organizer_id IS NOT NULL AND v_actor IS NOT NULL AND v_actor = v_training.organizer_id THEN
      v_action_type := 'removed';
    ELSE
      v_action_type := 'left';
    END IF;

    INSERT INTO public.training_event_logs (id, training_id, team_id, team_name, team_tag, action, created_at)
    VALUES (
      gen_random_uuid()::text,
      OLD.training_id,
      OLD.team_id,
      COALESCE(v_team.name, 'Equipe'),
      COALESCE(v_team.tag, '—'),
      jsonb_build_object('type', v_action_type, 'actor_id', v_actor)::text,
      now()::text
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
        now()::text
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create triggers (idempotent)
DROP TRIGGER IF EXISTS trg_training_registrations_audit_ins ON public.training_registrations;
DROP TRIGGER IF EXISTS trg_training_registrations_audit_del ON public.training_registrations;

CREATE TRIGGER trg_training_registrations_audit_ins
AFTER INSERT ON public.training_registrations
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_registrations_audit();

CREATE TRIGGER trg_training_registrations_audit_del
AFTER DELETE ON public.training_registrations
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_registrations_audit();
