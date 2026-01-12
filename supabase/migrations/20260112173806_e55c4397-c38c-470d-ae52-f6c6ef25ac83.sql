-- Add bonus_points column to training_match_scores
ALTER TABLE public.training_match_scores 
ADD COLUMN IF NOT EXISTS bonus_points integer NOT NULL DEFAULT 0;