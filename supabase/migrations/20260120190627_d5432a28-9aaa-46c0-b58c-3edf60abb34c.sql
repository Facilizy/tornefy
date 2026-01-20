-- Create organizer_follows table for follow functionality
CREATE TABLE IF NOT EXISTS public.organizer_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  follower_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organizer_id, follower_id)
);

-- Enable RLS
ALTER TABLE public.organizer_follows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view follow counts" 
ON public.organizer_follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own follows" 
ON public.organizer_follows 
FOR ALL 
USING (auth.uid() = follower_id);

-- Create function to get follower count
CREATE OR REPLACE FUNCTION public.get_organizer_follow_count(_organizer_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.organizer_follows WHERE organizer_id = _organizer_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create training_player_stats table for individual player stats per match
CREATE TABLE IF NOT EXISTS public.training_player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.training_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  is_mvp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_player_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Player stats are viewable by everyone" 
ON public.training_player_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Organizers can manage player stats" 
ON public.training_player_stats 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM training_matches tm
    JOIN trainings t ON t.id = tm.training_id
    WHERE tm.id = training_player_stats.match_id 
    AND t.organizer_id = auth.uid()
  )
);

-- Create user_achievements table for tracking player achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievements" 
ON public.user_achievements 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create achievements table for achievement definitions
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL DEFAULT 1,
  badge_icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements 
FOR SELECT 
USING (true);