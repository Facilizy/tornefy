-- Add toggle for enabling/disabling scrim groups UI/logic
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS use_groups boolean NOT NULL DEFAULT false;