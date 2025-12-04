-- Table for training rounds (rodadas)
CREATE TABLE public.training_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for matches within rounds (quedas)
CREATE TABLE public.training_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.training_rounds(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  match_number INTEGER NOT NULL DEFAULT 1,
  map_name TEXT,
  match_time TIME,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for team scores in each match
CREATE TABLE public.training_match_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.training_matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  position_points INTEGER NOT NULL DEFAULT 0,
  kill_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, team_id),
  UNIQUE(match_id, position)
);

-- Enable RLS
ALTER TABLE public.training_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_match_scores ENABLE ROW LEVEL SECURITY;

-- RLS for training_rounds
CREATE POLICY "Rounds are viewable by everyone" ON public.training_rounds FOR SELECT USING (true);
CREATE POLICY "Organizers can manage their training rounds" ON public.training_rounds FOR ALL 
USING (EXISTS (SELECT 1 FROM trainings WHERE trainings.id = training_rounds.training_id AND trainings.organizer_id = auth.uid()));

-- RLS for training_matches
CREATE POLICY "Matches are viewable by everyone" ON public.training_matches FOR SELECT USING (true);
CREATE POLICY "Organizers can manage their training matches" ON public.training_matches FOR ALL 
USING (EXISTS (SELECT 1 FROM trainings WHERE trainings.id = training_matches.training_id AND trainings.organizer_id = auth.uid()));

-- RLS for training_match_scores
CREATE POLICY "Scores are viewable by everyone" ON public.training_match_scores FOR SELECT USING (true);
CREATE POLICY "Organizers can manage match scores" ON public.training_match_scores FOR ALL 
USING (EXISTS (
  SELECT 1 FROM training_matches tm 
  JOIN trainings t ON t.id = tm.training_id 
  WHERE tm.id = training_match_scores.match_id AND t.organizer_id = auth.uid()
));