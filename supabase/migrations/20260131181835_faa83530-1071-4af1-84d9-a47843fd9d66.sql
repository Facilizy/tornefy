-- Create player game accounts table
CREATE TABLE IF NOT EXISTS public.player_game_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  in_game_nick TEXT NOT NULL,
  in_game_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_game_accounts_user_game_unique UNIQUE (user_id, game_id)
);

-- Enable RLS
ALTER TABLE public.player_game_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own game accounts"
ON public.player_game_accounts
FOR SELECT
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can insert own game accounts"
ON public.player_game_accounts
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can update own game accounts"
ON public.player_game_accounts
FOR UPDATE
USING ((auth.uid())::text = user_id)
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete own game accounts"
ON public.player_game_accounts
FOR DELETE
USING ((auth.uid())::text = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_game_accounts_user_id ON public.player_game_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_accounts_game_id ON public.player_game_accounts (game_id);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_player_game_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trg_player_game_accounts_updated_at
    BEFORE UPDATE ON public.player_game_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;