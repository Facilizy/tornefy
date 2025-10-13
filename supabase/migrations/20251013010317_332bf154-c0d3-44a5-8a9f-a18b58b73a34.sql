-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  related_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify all players about new training
CREATE OR REPLACE FUNCTION notify_new_training()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    p.id,
    'Novo Treino Disponível! 🎮',
    'O treino "' || NEW.name || '" foi criado. Inscreva-se agora!',
    'new_training',
    NEW.id
  FROM public.profiles p
  WHERE p.role = 'player'::user_role;
  
  RETURN NEW;
END;
$$;

-- Trigger for new trainings
CREATE TRIGGER on_training_created
AFTER INSERT ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION notify_new_training();

-- Function to notify registered teams about status change
CREATE OR REPLACE FUNCTION notify_training_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      t.owner_id,
      'Status do Treino Atualizado 📢',
      'O treino "' || NEW.name || '" mudou para: ' || NEW.status,
      'status_change',
      NEW.id
    FROM public.training_registrations tr
    JOIN public.teams t ON t.id = tr.team_id
    WHERE tr.training_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for status changes
CREATE TRIGGER on_training_status_changed
AFTER UPDATE ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION notify_training_status_change();

-- Function to notify registered teams about new chat messages
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  training_name text;
BEGIN
  SELECT name INTO training_name
  FROM public.trainings
  WHERE id = NEW.training_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  SELECT 
    t.owner_id,
    'Nova Mensagem do Organizador 💬',
    'Nova mensagem no treino "' || training_name || '"',
    'chat_message',
    NEW.training_id
  FROM public.training_registrations tr
  JOIN public.teams t ON t.id = tr.team_id
  WHERE tr.training_id = NEW.training_id
  AND t.owner_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Trigger for chat messages
CREATE TRIGGER on_chat_message_sent
AFTER INSERT ON public.training_messages
FOR EACH ROW
EXECUTE FUNCTION notify_chat_message();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);