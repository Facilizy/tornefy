-- Add slot_number to training_registrations
ALTER TABLE public.training_registrations
ADD COLUMN slot_number integer;

-- Create index for faster slot queries
CREATE INDEX idx_training_registrations_slot ON public.training_registrations(training_id, slot_number);

-- Add sender_id to training_messages (nullable first)
ALTER TABLE public.training_messages
ADD COLUMN sender_id uuid REFERENCES auth.users(id);

-- Update existing messages to set sender_id to the training organizer
UPDATE public.training_messages
SET sender_id = (
  SELECT organizer_id 
  FROM public.trainings 
  WHERE trainings.id = training_messages.training_id
);

-- Now make sender_id NOT NULL
ALTER TABLE public.training_messages
ALTER COLUMN sender_id SET NOT NULL;

-- Allow organizers to update their own messages
CREATE POLICY "Organizers can update their own messages"
ON public.training_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Allow organizers to delete their own messages
CREATE POLICY "Organizers can delete their own messages"
ON public.training_messages
FOR DELETE
USING (auth.uid() = sender_id);