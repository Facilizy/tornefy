-- Fix: create policies for training_event_logs without dynamic SQL

ALTER TABLE public.training_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can insert event logs" ON public.training_event_logs;
CREATE POLICY "Organizers can insert event logs"
ON public.training_event_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id = training_event_logs.training_id
      AND t.organizer_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Organizers can view logs for their trainings" ON public.training_event_logs;
CREATE POLICY "Organizers can view logs for their trainings"
ON public.training_event_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id = training_event_logs.training_id
      AND t.organizer_id = auth.uid()::text
  )
);
