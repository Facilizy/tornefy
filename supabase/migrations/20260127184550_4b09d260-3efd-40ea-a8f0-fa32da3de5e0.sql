-- Add claim tracking for achievements (missions)
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL;

-- Optional index to quickly fetch claimed emblems per user
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_claimed_at
ON public.user_achievements (user_id, claimed_at DESC)
WHERE claimed_at IS NOT NULL;
