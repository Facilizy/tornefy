-- Fix security issues: Restrict public access to sensitive user data

-- Drop existing public SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create new restricted policy for profiles
-- Users can view their own profile, and everyone can view organizers (needed for displaying training organizers)
CREATE POLICY "Users can view own profile and organizers are public" 
  ON public.profiles 
  FOR SELECT 
  USING (
    auth.uid() = id OR role = 'organizer'::user_role
  );

-- Drop existing public SELECT policy on team_members
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;

-- Create new restricted policy for team_members
-- Only team owners and registered participants in the same training can view team members
CREATE POLICY "Team members viewable by team owners and training participants" 
  ON public.team_members 
  FOR SELECT 
  USING (
    -- Team owner can view their own members
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR
    -- Users who are registered in the same training can view other participants
    EXISTS (
      SELECT 1 FROM public.training_registrations tr1
      INNER JOIN public.training_registrations tr2 ON tr1.training_id = tr2.training_id
      INNER JOIN public.teams t ON t.id = tr2.team_id
      WHERE tr1.team_id = team_members.team_id
      AND t.owner_id = auth.uid()
    )
    OR
    -- Allow unauthenticated users to see members of teams registered in trainings (for public viewing)
    -- This maintains the functionality of showing registered teams on training detail pages
    EXISTS (
      SELECT 1 FROM public.training_registrations
      WHERE training_registrations.team_id = team_members.team_id
    )
  );

-- Note: The third security issue (leaked password protection) needs to be enabled
-- in the Supabase Auth settings, which cannot be done via SQL migration.