-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('player', 'organizer');
CREATE TYPE platform_type AS ENUM ('PC', 'Mobile', 'Misto');
CREATE TYPE mode_type AS ENUM ('Solo', 'Duo', 'Squad');
CREATE TYPE player_function AS ENUM ('IGL', 'Suporte', 'Fragger', 'Scout', 'Lurker');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  discord TEXT NOT NULL,
  function player_function NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, game_id)
);

-- Create trainings table
CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  banner_url TEXT,
  datetime TIMESTAMPTZ NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 1,
  points_per_kill INTEGER NOT NULL DEFAULT 1,
  points_per_position JSONB NOT NULL DEFAULT '[]',
  platform platform_type NOT NULL,
  mode mode_type NOT NULL,
  rules TEXT,
  discord_link TEXT,
  live_link TEXT,
  max_slots INTEGER NOT NULL DEFAULT 20,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_live BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create training_registrations table
CREATE TABLE public.training_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(training_id, team_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_registrations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Teams policies
CREATE POLICY "Teams are viewable by everyone" 
  ON public.teams FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create teams" 
  ON public.teams FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams" 
  ON public.teams FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams" 
  ON public.teams FOR DELETE 
  USING (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Team members are viewable by everyone" 
  ON public.team_members FOR SELECT 
  USING (true);

CREATE POLICY "Team owners can manage members" 
  ON public.team_members FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Trainings policies
CREATE POLICY "Trainings are viewable by everyone" 
  ON public.trainings FOR SELECT 
  USING (true);

CREATE POLICY "Organizers can create trainings" 
  ON public.trainings FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = organizer_id AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'organizer'
    )
  );

CREATE POLICY "Organizers can update their trainings" 
  ON public.trainings FOR UPDATE 
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their trainings" 
  ON public.trainings FOR DELETE 
  USING (auth.uid() = organizer_id);

-- Training registrations policies
CREATE POLICY "Registrations are viewable by everyone" 
  ON public.training_registrations FOR SELECT 
  USING (true);

CREATE POLICY "Team owners can register their teams" 
  ON public.training_registrations FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = training_registrations.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can unregister their teams" 
  ON public.training_registrations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE teams.id = training_registrations.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'player')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_teams
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_trainings
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();