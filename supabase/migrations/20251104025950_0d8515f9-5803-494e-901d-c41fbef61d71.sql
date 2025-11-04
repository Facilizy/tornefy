-- Criar função para notificar organizador sobre inscrições/saídas de equipes
CREATE OR REPLACE FUNCTION public.notify_team_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  training_name text;
  team_name text;
BEGIN
  -- Buscar nome do treino e da equipe
  SELECT t.name, tm.name INTO training_name, team_name
  FROM public.trainings t, public.teams tm
  WHERE t.id = NEW.training_id AND tm.id = NEW.team_id;
  
  -- Notificar organizador sobre nova inscrição
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    t.organizer_id,
    '✅ Nova Inscrição!',
    'A equipe "' || team_name || '" se inscreveu no treino "' || training_name || '"',
    'team_registration',
    NEW.training_id
  FROM public.trainings t
  WHERE t.id = NEW.training_id;
  
  RETURN NEW;
END;
$$;

-- Criar função para notificar organizador sobre saída de equipes
CREATE OR REPLACE FUNCTION public.notify_team_unregistration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  training_name text;
  team_name text;
BEGIN
  -- Buscar nome do treino e da equipe
  SELECT t.name, tm.name INTO training_name, team_name
  FROM public.trainings t, public.teams tm
  WHERE t.id = OLD.training_id AND tm.id = OLD.team_id;
  
  -- Notificar organizador sobre saída
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    t.organizer_id,
    '❌ Equipe Saiu',
    'A equipe "' || team_name || '" saiu do treino "' || training_name || '"',
    'team_unregistration',
    OLD.training_id
  FROM public.trainings t
  WHERE t.id = OLD.training_id;
  
  RETURN OLD;
END;
$$;

-- Criar triggers para inscrição e saída
CREATE TRIGGER notify_team_registration_trigger
  AFTER INSERT ON public.training_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_registration();

CREATE TRIGGER notify_team_unregistration_trigger
  AFTER DELETE ON public.training_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_unregistration();