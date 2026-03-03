-- TorneCoins: Stripe top-ups (idempotency)

CREATE TABLE IF NOT EXISTS public.tornecoin_stripe_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tornecoin_stripe_topups_user_id_idx
  ON public.tornecoin_stripe_topups (user_id, created_at DESC);

ALTER TABLE public.tornecoin_stripe_topups ENABLE ROW LEVEL SECURITY;

-- No client policies: only service role / edge functions should read/write.
