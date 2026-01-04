-- Add new game types to the enum
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'prime_rush';
ALTER TYPE public.game_type ADD VALUE IF NOT EXISTS 'battlefield_6';