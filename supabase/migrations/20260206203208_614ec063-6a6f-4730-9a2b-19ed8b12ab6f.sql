-- Add entry fee support to trainings + registrations
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS entry_fee_coins integer NOT NULL DEFAULT 0;

ALTER TABLE public.training_registrations
ADD COLUMN IF NOT EXISTS paid_amount_coins integer NOT NULL DEFAULT 0;

-- Helpful index for filtering paid events (optional)
CREATE INDEX IF NOT EXISTS idx_trainings_entry_fee_coins ON public.trainings(entry_fee_coins);