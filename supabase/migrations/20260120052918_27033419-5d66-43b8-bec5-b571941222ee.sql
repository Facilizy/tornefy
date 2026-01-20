-- Fix privacy: restrict access to team_members (avoid exposing Discord handles and rosters to everyone)

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policies (names from older migrations)
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
DROP POLICY IF EXISTS "Team members viewable by team owners and in registered trainings" ON public.team_members;
DROP POLICY IF EXISTS "Organizers can view registered team members" ON public.team_members;

-- Allow only team admins (owner or accepted admin invite) to view their own members
CREATE POLICY "Team admins can view their members"
ON public.team_members
FOR SELECT
USING (
  public.is_team_admin((auth.uid())::text, (team_members.team_id)::text)
);
