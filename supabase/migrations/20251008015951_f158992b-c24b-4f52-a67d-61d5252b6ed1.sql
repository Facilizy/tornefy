-- Fix security vulnerability: Restrict team_members visibility
-- Only team owners and training organizers should see team members

-- Drop the insecure policy
DROP POLICY IF EXISTS "Team members viewable by team owners and in registered training" ON public.team_members;

-- Create secure policy: Team owners can view their own team members
CREATE POLICY "Team owners can view their own team members"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- Create secure policy: Organizers can view team members of teams registered in their trainings
CREATE POLICY "Organizers can view registered team members"
ON public.team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM training_registrations tr
    INNER JOIN trainings t ON t.id = tr.training_id
    WHERE tr.team_id = team_members.team_id
    AND t.organizer_id = auth.uid()
  )
);