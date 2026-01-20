-- Create team_lines table for team roster lines
CREATE TABLE IF NOT EXISTS public.team_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_lines ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team lines are viewable by everyone" 
ON public.team_lines 
FOR SELECT 
USING (true);

CREATE POLICY "Team owners can manage lines" 
ON public.team_lines 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_lines.team_id AND teams.owner_id = auth.uid()
  )
);

-- Create training_waitlist table
CREATE TABLE IF NOT EXISTS public.training_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_id, team_id)
);

-- Enable RLS
ALTER TABLE public.training_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Waitlist is viewable by everyone" 
ON public.training_waitlist 
FOR SELECT 
USING (true);

CREATE POLICY "Team owners can join/leave waitlist" 
ON public.training_waitlist 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = training_waitlist.team_id AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Organizers can manage waitlist" 
ON public.training_waitlist 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM trainings WHERE trainings.id = training_waitlist.training_id AND trainings.organizer_id = auth.uid()
  )
);

-- Create training_checkins table
CREATE TABLE IF NOT EXISTS public.training_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_id, team_id)
);

-- Enable RLS
ALTER TABLE public.training_checkins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Checkins are viewable by everyone" 
ON public.training_checkins 
FOR SELECT 
USING (true);

CREATE POLICY "Team owners can check in/out" 
ON public.training_checkins 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM teams WHERE teams.id = training_checkins.team_id AND teams.owner_id = auth.uid()
  )
);

CREATE POLICY "Organizers can manage checkins" 
ON public.training_checkins 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM trainings WHERE trainings.id = training_checkins.training_id AND trainings.organizer_id = auth.uid()
  )
);

-- Add line_id column to training_registrations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'training_registrations' 
    AND column_name = 'line_id'
  ) THEN
    ALTER TABLE public.training_registrations ADD COLUMN line_id UUID REFERENCES public.team_lines(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add line_id and user_id columns to team_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'team_members' 
    AND column_name = 'line_id'
  ) THEN
    ALTER TABLE public.team_members ADD COLUMN line_id UUID REFERENCES public.team_lines(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'team_members' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.team_members ADD COLUMN user_id UUID;
  END IF;
END
$$;