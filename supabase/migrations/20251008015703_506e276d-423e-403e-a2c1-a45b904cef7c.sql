-- Force complete types regeneration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_refresh_column text;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS temp_refresh_column;