-- Create training_messages table for organizer to send messages to teams
CREATE TABLE public.training_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;

-- Organizers can send messages to their own trainings
CREATE POLICY "Organizers can send messages to their trainings"
ON public.training_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainings
    WHERE trainings.id = training_messages.training_id
    AND trainings.organizer_id = auth.uid()
  )
);

-- Everyone can view messages from trainings they're registered in
CREATE POLICY "Registered teams can view training messages"
ON public.training_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_registrations
    JOIN public.teams ON teams.id = training_registrations.team_id
    WHERE training_registrations.training_id = training_messages.training_id
    AND teams.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trainings
    WHERE trainings.id = training_messages.training_id
    AND trainings.organizer_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_training_messages_training_id ON public.training_messages(training_id);
CREATE INDEX idx_training_messages_created_at ON public.training_messages(created_at DESC);