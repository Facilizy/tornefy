-- Financeiro: saques e antecipações (base para Admin)

CREATE TABLE IF NOT EXISTS public.tornecoin_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  account_id UUID NULL,
  amount_coins INTEGER NOT NULL,
  fee_coins INTEGER NOT NULL DEFAULT 0,
  net_coins INTEGER NOT NULL,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'requested',
  admin_notes TEXT NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tornecoin_withdrawal_requests_user_id_idx
  ON public.tornecoin_withdrawal_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tornecoin_withdrawal_requests_status_idx
  ON public.tornecoin_withdrawal_requests (status, created_at DESC);

ALTER TABLE public.tornecoin_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tornecoin_anticipation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id TEXT NOT NULL,
  account_id UUID NULL,
  amount_coins INTEGER NOT NULL,
  reason TEXT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  admin_notes TEXT NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tornecoin_anticipation_requests_organizer_id_idx
  ON public.tornecoin_anticipation_requests (organizer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tornecoin_anticipation_requests_status_idx
  ON public.tornecoin_anticipation_requests (status, created_at DESC);

ALTER TABLE public.tornecoin_anticipation_requests ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_withdrawals_updated_at'
  ) THEN
    CREATE TRIGGER trg_withdrawals_updated_at
    BEFORE UPDATE ON public.tornecoin_withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_anticipations_updated_at'
  ) THEN
    CREATE TRIGGER trg_anticipations_updated_at
    BEFORE UPDATE ON public.tornecoin_anticipation_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS policies (minimal user access; admin uses service role)
-- Withdrawals: user can view/create own requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tornecoin_withdrawal_requests' AND policyname='withdrawals_select_own'
  ) THEN
    CREATE POLICY withdrawals_select_own
    ON public.tornecoin_withdrawal_requests
    FOR SELECT
    USING (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tornecoin_withdrawal_requests' AND policyname='withdrawals_insert_own'
  ) THEN
    CREATE POLICY withdrawals_insert_own
    ON public.tornecoin_withdrawal_requests
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Anticipations: organizer can view/create own requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tornecoin_anticipation_requests' AND policyname='anticipations_select_own'
  ) THEN
    CREATE POLICY anticipations_select_own
    ON public.tornecoin_anticipation_requests
    FOR SELECT
    USING (auth.uid()::text = organizer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tornecoin_anticipation_requests' AND policyname='anticipations_insert_own'
  ) THEN
    CREATE POLICY anticipations_insert_own
    ON public.tornecoin_anticipation_requests
    FOR INSERT
    WITH CHECK (auth.uid()::text = organizer_id);
  END IF;
END $$;
