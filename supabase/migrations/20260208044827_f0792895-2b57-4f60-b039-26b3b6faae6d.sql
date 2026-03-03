-- Fix: avoid casting '' to timestamptz inside COALESCE in audit trigger
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

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_name_changed',
      'summary', 'Nome do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  -- NOTE: datetime is timestamptz; use null-safe comparison without COALESCE('')
  IF NEW.datetime IS DISTINCT FROM OLD.datetime THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_datetime_changed',
      'summary', 'Data/hora do treino alterada',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_status_changed',
      'summary', 'Status do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.max_slots IS DISTINCT FROM OLD.max_slots THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_max_slots_changed',
      'summary', 'Número de slots alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.mode IS DISTINCT FROM OLD.mode THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_mode_changed',
      'summary', 'Modo do treino alterado',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.rules IS DISTINCT FROM OLD.rules THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_rules_changed',
      'summary', 'Regras do treino alteradas',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.discord_link IS DISTINCT FROM OLD.discord_link
     OR NEW.whatsapp_link IS DISTINCT FROM OLD.whatsapp_link
     OR NEW.live_link IS DISTINCT FROM OLD.live_link THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_links_changed',
      'summary', 'Links do treino atualizados',
      'actor_id', v_actor
    ));
  END IF;

  IF NEW.primary_color IS DISTINCT FROM OLD.primary_color
     OR NEW.secondary_color IS DISTINCT FROM OLD.secondary_color THEN
    PERFORM public._insert_training_event_log(NEW.id::text, NULL, jsonb_build_object(
      'type','training_colors_changed',
      'summary', 'Cores do treino atualizadas',
      'actor_id', v_actor
    ));
  END IF;

  RETURN NEW;
END;
$$;