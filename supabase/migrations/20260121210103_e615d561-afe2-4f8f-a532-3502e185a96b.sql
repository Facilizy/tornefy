-- Add preferred language to profiles (used by i18n and profile settings)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'pt-BR';

-- Optional: index for faster lookups by language (analytics/segmentation)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
ON public.profiles (preferred_language);
