-- Add 'console' to platform_type enum
ALTER TYPE platform_type ADD VALUE IF NOT EXISTS 'console';

-- Create team_invites table for invite system
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_username TEXT,
  is_external BOOLEAN NOT NULL DEFAULT false,
  external_player_name TEXT,
  external_discord TEXT,
  external_game_id TEXT,
  permission TEXT NOT NULL DEFAULT 'member' CHECK (permission IN ('admin', 'member', 'substitute')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invite_target_check CHECK (
    (is_external = false AND invited_user_id IS NOT NULL) OR 
    (is_external = true AND external_player_name IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Team owners can manage invites
CREATE POLICY "Team owners can manage invites"
ON public.team_invites FOR ALL
USING (EXISTS (
  SELECT 1 FROM teams WHERE teams.id = team_invites.team_id AND teams.owner_id = auth.uid()
));

-- Invited users can view and respond to their invites
CREATE POLICY "Users can view their own invites"
ON public.team_invites FOR SELECT
USING (invited_user_id = auth.uid());

CREATE POLICY "Users can update their own invites"
ON public.team_invites FOR UPDATE
USING (invited_user_id = auth.uid())
WITH CHECK (invited_user_id = auth.uid() AND status IN ('accepted', 'rejected'));

-- Create team_badges table
CREATE TABLE public.team_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('participation', 'victory', 'top3', 'top5', 'veteran', 'champion', 'streak')),
  badge_count INTEGER NOT NULL DEFAULT 1,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, badge_type)
);

-- Enable RLS for badges
ALTER TABLE public.team_badges ENABLE ROW LEVEL SECURITY;

-- Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone"
ON public.team_badges FOR SELECT
USING (true);

-- System can manage badges (for triggers/functions)
CREATE POLICY "System can manage badges"
ON public.team_badges FOR ALL
USING (true)
WITH CHECK (true);

-- Add training colors columns
ALTER TABLE public.trainings 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#9146FF',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1F2937';

-- Add training template colors
ALTER TABLE public.training_templates
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#9146FF',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1F2937';

-- Function to update team badges based on performance
CREATE OR REPLACE FUNCTION public.update_team_badges()
RETURNS TRIGGER AS $$
DECLARE
  team_participations INTEGER;
  team_victories INTEGER;
  team_top3 INTEGER;
  team_top5 INTEGER;
  target_team_id UUID;
BEGIN
  -- Get the team_id from the score that was inserted/updated
  target_team_id := COALESCE(NEW.team_id, OLD.team_id);
  
  -- Count participations (unique trainings)
  SELECT COUNT(DISTINCT tm.training_id) INTO team_participations
  FROM training_match_scores tms
  JOIN training_matches tm ON tm.id = tms.match_id
  WHERE tms.team_id = target_team_id;
  
  -- Count victories (position = 1)
  SELECT COUNT(*) INTO team_victories
  FROM training_match_scores
  WHERE team_id = target_team_id AND position = 1;
  
  -- Count top 3
  SELECT COUNT(*) INTO team_top3
  FROM training_match_scores
  WHERE team_id = target_team_id AND position <= 3;
  
  -- Count top 5
  SELECT COUNT(*) INTO team_top5
  FROM training_match_scores
  WHERE team_id = target_team_id AND position <= 5;
  
  -- Update badges
  INSERT INTO team_badges (team_id, badge_type, badge_count)
  VALUES (target_team_id, 'participation', team_participations)
  ON CONFLICT (team_id, badge_type) 
  DO UPDATE SET badge_count = EXCLUDED.badge_count, earned_at = now();
  
  IF team_victories > 0 THEN
    INSERT INTO team_badges (team_id, badge_type, badge_count)
    VALUES (target_team_id, 'victory', team_victories)
    ON CONFLICT (team_id, badge_type) 
    DO UPDATE SET badge_count = EXCLUDED.badge_count, earned_at = now();
  END IF;
  
  IF team_top3 > 0 THEN
    INSERT INTO team_badges (team_id, badge_type, badge_count)
    VALUES (target_team_id, 'top3', team_top3)
    ON CONFLICT (team_id, badge_type) 
    DO UPDATE SET badge_count = EXCLUDED.badge_count, earned_at = now();
  END IF;
  
  IF team_top5 > 0 THEN
    INSERT INTO team_badges (team_id, badge_type, badge_count)
    VALUES (target_team_id, 'top5', team_top5)
    ON CONFLICT (team_id, badge_type) 
    DO UPDATE SET badge_count = EXCLUDED.badge_count, earned_at = now();
  END IF;
  
  -- Veteran badge (10+ participations)
  IF team_participations >= 10 THEN
    INSERT INTO team_badges (team_id, badge_type, badge_count)
    VALUES (target_team_id, 'veteran', 1)
    ON CONFLICT (team_id, badge_type) DO NOTHING;
  END IF;
  
  -- Champion badge (5+ victories)
  IF team_victories >= 5 THEN
    INSERT INTO team_badges (team_id, badge_type, badge_count)
    VALUES (target_team_id, 'champion', 1)
    ON CONFLICT (team_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update badges when scores change
CREATE TRIGGER update_badges_on_score_change
AFTER INSERT OR UPDATE OR DELETE ON training_match_scores
FOR EACH ROW
EXECUTE FUNCTION update_team_badges();