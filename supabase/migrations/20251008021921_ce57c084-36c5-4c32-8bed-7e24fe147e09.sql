-- Allow organizers to view team members of registered teams in their trainings
CREATE POLICY "Organizers can view registered team members"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.training_registrations tr
    JOIN public.trainings t ON t.id = tr.training_id
    WHERE tr.team_id = team_members.team_id
    AND t.organizer_id = auth.uid()
  )
);