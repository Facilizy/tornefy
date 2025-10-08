-- Fix security issues: Restrict public access to sensitive user data (v2)

-- First, check and drop existing policies
DO $$ 
BEGIN
  -- Drop profiles policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    DROP POLICY "Profiles are viewable by everyone" ON public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile and organizers are public'
  ) THEN
    DROP POLICY "Users can view own profile and organizers are public" ON public.profiles;
  END IF;

  -- Drop team_members policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_members' 
    AND policyname = 'Team members are viewable by everyone'
  ) THEN
    DROP POLICY "Team members are viewable by everyone" ON public.team_members;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_members' 
    AND policyname = 'Team members viewable by team owners and training participants'
  ) THEN
    DROP POLICY "Team members viewable by team owners and training participants" ON public.team_members;
  END IF;
END $$;

-- Create new restricted policy for profiles
-- Users can view their own profile, and everyone can view organizers (needed for displaying training organizers)
CREATE POLICY "Users can view own profile and organizers are public" 
  ON public.profiles 
  FOR SELECT 
  USING (
    auth.uid() = id OR role = 'organizer'::user_role
  );

-- Create new restricted policy for team_members
-- Only team owners and users viewing training details (where teams are registered) can see members
CREATE POLICY "Team members viewable by team owners and in registered trainings" 
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
    -- Members are visible if the team is registered in a training (for public viewing on training detail pages)
    EXISTS (
      SELECT 1 FROM public.training_registrations
      WHERE training_registrations.team_id = team_members.team_id
    )
  );