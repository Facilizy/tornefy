-- Fix training_messages defaults and backfill existing rows with nulls

-- 1) Backfill existing rows
UPDATE public.training_messages
SET id = gen_random_uuid()::text
WHERE id IS NULL;

UPDATE public.training_messages
SET created_at = now()
WHERE created_at IS NULL;

-- 2) Set sensible defaults for new rows
ALTER TABLE public.training_messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now();

-- 3) Make columns NOT NULL (safe after backfill)
ALTER TABLE public.training_messages
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN message SET NOT NULL,
  ALTER COLUMN sender_id SET NOT NULL,
  ALTER COLUMN training_id SET NOT NULL;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_training_messages_training_id_created_at
  ON public.training_messages (training_id, created_at);

CREATE INDEX IF NOT EXISTS idx_training_messages_sender_id
  ON public.training_messages (sender_id);
