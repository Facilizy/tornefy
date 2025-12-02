-- Add flag for external (organizer-only) teams
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- Make related records cascade on delete so trainings and teams can be removed safely
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_team_id_fkey,
ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE CASCADE;

ALTER TABLE public.training_registrations
DROP CONSTRAINT IF EXISTS training_registrations_team_id_fkey,
ADD CONSTRAINT training_registrations_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE CASCADE;

ALTER TABLE public.training_registrations
DROP CONSTRAINT IF EXISTS training_registrations_training_id_fkey,
ADD CONSTRAINT training_registrations_training_id_fkey
  FOREIGN KEY (training_id)
  REFERENCES public.trainings(id)
  ON DELETE CASCADE;

ALTER TABLE public.training_messages
DROP CONSTRAINT IF EXISTS training_messages_training_id_fkey,
ADD CONSTRAINT training_messages_training_id_fkey
  FOREIGN KEY (training_id)
  REFERENCES public.trainings(id)
  ON DELETE CASCADE;

ALTER TABLE public.training_event_logs
DROP CONSTRAINT IF EXISTS training_event_logs_training_id_fkey,
ADD CONSTRAINT training_event_logs_training_id_fkey
  FOREIGN KEY (training_id)
  REFERENCES public.trainings(id)
  ON DELETE CASCADE;

ALTER TABLE public.team_reports
DROP CONSTRAINT IF EXISTS team_reports_team_id_fkey,
ADD CONSTRAINT team_reports_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE CASCADE;

ALTER TABLE public.team_reports
DROP CONSTRAINT IF EXISTS team_reports_training_id_fkey,
ADD CONSTRAINT team_reports_training_id_fkey
  FOREIGN KEY (training_id)
  REFERENCES public.trainings(id)
  ON DELETE CASCADE;

-- Allow organizers to remove registrations from their own trainings
CREATE POLICY "Organizers can remove team registrations"
ON public.training_registrations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id = training_registrations.training_id
      AND t.organizer_id = auth.uid()
  )
);