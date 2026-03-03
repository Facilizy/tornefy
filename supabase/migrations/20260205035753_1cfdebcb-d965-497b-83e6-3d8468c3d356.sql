-- Tighten RLS on training_event_logs: forbid client inserts (logs should be inserted by SECURITY DEFINER triggers)

ALTER TABLE public.training_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert event logs" ON public.training_event_logs;
DROP POLICY IF EXISTS "Organizers can insert event logs" ON public.training_event_logs;

CREATE POLICY "No client inserts on training_event_logs"
ON public.training_event_logs
FOR INSERT
TO authenticated
WITH CHECK (false);
