-- Trigger para notificar quando uma equipe recebe blacklist
CREATE OR REPLACE FUNCTION public.notify_team_blacklisted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  team_owner_id uuid;
  expires_text text;
BEGIN
  -- Buscar o dono da equipe pela tag
  SELECT owner_id INTO team_owner_id
  FROM public.teams
  WHERE tag = NEW.team_tag
  LIMIT 1;
  
  -- Se encontrou o dono da equipe, notificar
  IF team_owner_id IS NOT NULL THEN
    expires_text := CASE
      WHEN NEW.expires_at IS NOT NULL THEN ' até ' || to_char(NEW.expires_at, 'DD/MM/YYYY')
      ELSE ''
    END;
    
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      team_owner_id,
      '⚠️ Blacklist Aplicado',
      'Sua equipe [' || NEW.team_tag || '] foi adicionada à blacklist de um organizador' || expires_text || '. Motivo: ' || COALESCE(NEW.reason, 'Não especificado'),
      'blacklist_added',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger para notificar quando o prazo de blacklist expira
CREATE OR REPLACE FUNCTION public.notify_blacklist_expired()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_blacklist record;
  team_owner_id uuid;
BEGIN
  -- Buscar blacklists que expiraram nas últimas 24 horas e ainda não foram notificados
  FOR expired_blacklist IN
    SELECT DISTINCT ON (team_tag, organizer_id) *
    FROM public.organizer_blacklist
    WHERE expires_at IS NOT NULL
      AND expires_at > now() - interval '24 hours'
      AND expires_at <= now()
  LOOP
    -- Buscar o dono da equipe pela tag
    SELECT owner_id INTO team_owner_id
    FROM public.teams
    WHERE tag = expired_blacklist.team_tag
    LIMIT 1;
    
    -- Se encontrou o dono da equipe, notificar
    IF team_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        team_owner_id,
        '✅ Blacklist Expirado',
        'A blacklist da sua equipe [' || expired_blacklist.team_tag || '] de um organizador expirou. Você pode se inscrever novamente nos treinos deste organizador.',
        'blacklist_expired',
        expired_blacklist.id
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

-- Criar trigger para blacklist adicionado
DROP TRIGGER IF EXISTS on_team_blacklisted ON public.organizer_blacklist;
CREATE TRIGGER on_team_blacklisted
  AFTER INSERT ON public.organizer_blacklist
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_blacklisted();

-- Função para notificar quando treino é deletado
CREATE OR REPLACE FUNCTION public.notify_training_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notificar todas as equipes inscritas
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    t.owner_id,
    '❌ Treino Cancelado',
    'O treino "' || OLD.name || '" foi cancelado pelo organizador.',
    'training_deleted',
    OLD.id
  FROM public.training_registrations tr
  JOIN public.teams t ON t.id = tr.team_id
  WHERE tr.training_id = OLD.id;
  
  RETURN OLD;
END;
$function$;

-- Criar trigger para treino deletado
DROP TRIGGER IF EXISTS on_training_deleted ON public.trainings;
CREATE TRIGGER on_training_deleted
  BEFORE DELETE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_training_deleted();