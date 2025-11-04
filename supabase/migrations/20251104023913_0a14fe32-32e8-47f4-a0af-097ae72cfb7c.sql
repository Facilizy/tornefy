-- Criar trigger para notificar sobre novas mensagens de chat
CREATE TRIGGER notify_training_chat_message
  AFTER INSERT ON public.training_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();

-- Criar função para notificar quando treino ficar ao vivo
CREATE OR REPLACE FUNCTION public.notify_training_live_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notificar apenas quando mudar de false para true (começar transmissão ao vivo)
  IF OLD.is_live = false AND NEW.is_live = true THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      t.owner_id,
      '🔴 Treino AO VIVO!',
      'O treino "' || NEW.name || '" está transmitindo AO VIVO agora!',
      'live_status',
      NEW.id
    FROM public.training_registrations tr
    JOIN public.teams t ON t.id = tr.team_id
    WHERE tr.training_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificar sobre mudança de status ao vivo
CREATE TRIGGER notify_training_live_change
  AFTER UPDATE OF is_live ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_training_live_status();