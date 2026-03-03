-- =========
-- TorneCoins (MVP) + inscrição paga em coins (tournament escrow)
-- =========

-- 1) Core tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tornecoin_owner_type') THEN
    CREATE TYPE public.tornecoin_owner_type AS ENUM (
      'user',
      'organizer',
      'tournament_escrow',
      'platform'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tornecoin_tx_type') THEN
    CREATE TYPE public.tornecoin_tx_type AS ENUM (
      'deposit',
      'entry_fee',
      'refund',
      'release',
      'anticipation',
      'withdrawal',
      'fee'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tornecoin_tx_status') THEN
    CREATE TYPE public.tornecoin_tx_status AS ENUM (
      'posted',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tornecoin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type public.tornecoin_owner_type NOT NULL,
  owner_id TEXT NOT NULL,
  balance_available INTEGER NOT NULL DEFAULT 0,
  balance_pending INTEGER NOT NULL DEFAULT 0,
  balance_frozen INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS public.tornecoin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NULL REFERENCES public.tornecoin_accounts(id) ON DELETE SET NULL,
  to_account_id UUID NULL REFERENCES public.tornecoin_accounts(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type public.tornecoin_tx_type NOT NULL,
  status public.tornecoin_tx_status NOT NULL DEFAULT 'posted',
  service_fee INTEGER NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  available_at TIMESTAMPTZ NULL,
  is_anticipation BOOLEAN NOT NULL DEFAULT false,
  reference_type TEXT NULL,
  reference_id TEXT NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tornecoin_accounts_owner ON public.tornecoin_accounts(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_tornecoin_tx_created_at ON public.tornecoin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tornecoin_tx_reference ON public.tornecoin_transactions(reference_type, reference_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_tornecoin_accounts_updated_at ON public.tornecoin_accounts;
CREATE TRIGGER trg_tornecoin_accounts_updated_at
BEFORE UPDATE ON public.tornecoin_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) tournaments: add entry fee (MVP)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS entry_fee_coins INTEGER NOT NULL DEFAULT 0;

-- 3) RLS
ALTER TABLE public.tornecoin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tornecoin_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own user/organizer accounts
DROP POLICY IF EXISTS "Accounts readable by owner" ON public.tornecoin_accounts;
CREATE POLICY "Accounts readable by owner"
ON public.tornecoin_accounts
FOR SELECT
TO authenticated
USING (
  (owner_type = 'user' AND owner_id = auth.uid()::text)
  OR (owner_type = 'organizer' AND owner_id = auth.uid()::text)
);

-- No direct writes from client (no INSERT/UPDATE/DELETE policies)

-- Transactions readable if user can read from or to account
DROP POLICY IF EXISTS "Transactions readable by account owner" ON public.tornecoin_transactions;
CREATE POLICY "Transactions readable by account owner"
ON public.tornecoin_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tornecoin_accounts a
    WHERE a.id = tornecoin_transactions.from_account_id
      AND ((a.owner_type = 'user' AND a.owner_id = auth.uid()::text)
        OR (a.owner_type = 'organizer' AND a.owner_id = auth.uid()::text))
  )
  OR EXISTS (
    SELECT 1
    FROM public.tornecoin_accounts a
    WHERE a.id = tornecoin_transactions.to_account_id
      AND ((a.owner_type = 'user' AND a.owner_id = auth.uid()::text)
        OR (a.owner_type = 'organizer' AND a.owner_id = auth.uid()::text))
  )
);

-- 4) SQL functions (atomic)
CREATE OR REPLACE FUNCTION public.tornecoin_get_or_create_account(
  _owner_type public.tornecoin_owner_type,
  _owner_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.tornecoin_accounts
  WHERE owner_type = _owner_type AND owner_id = _owner_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.tornecoin_accounts (owner_type, owner_id)
  VALUES (_owner_type, _owner_id)
  ON CONFLICT (owner_type, owner_id)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tornecoin_transfer_available(
  _from_account_id uuid,
  _to_account_id uuid,
  _amount int,
  _type public.tornecoin_tx_type,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL,
  _meta jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_from record;
  v_to record;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_from FROM public.tornecoin_accounts WHERE id = _from_account_id FOR UPDATE;
  SELECT * INTO v_to   FROM public.tornecoin_accounts WHERE id = _to_account_id FOR UPDATE;

  IF v_from IS NULL OR v_to IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  IF v_from.balance_available < _amount THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  UPDATE public.tornecoin_accounts
  SET balance_available = balance_available - _amount
  WHERE id = _from_account_id;

  UPDATE public.tornecoin_accounts
  SET balance_frozen = balance_frozen + _amount
  WHERE id = _to_account_id;

  INSERT INTO public.tornecoin_transactions (
    from_account_id,
    to_account_id,
    amount,
    type,
    status,
    reference_type,
    reference_id,
    meta
  ) VALUES (
    _from_account_id,
    _to_account_id,
    _amount,
    _type,
    'posted',
    _reference_type,
    _reference_id,
    _meta
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Convenience: credit coins to user (admin/service usage later)
CREATE OR REPLACE FUNCTION public.tornecoin_credit_user(
  _user_id text,
  _amount int,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL,
  _meta jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_acc uuid;
  v_tx uuid;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  v_user_acc := public.tornecoin_get_or_create_account('user', _user_id);

  UPDATE public.tornecoin_accounts
  SET balance_available = balance_available + _amount
  WHERE id = v_user_acc;

  INSERT INTO public.tornecoin_transactions (
    from_account_id,
    to_account_id,
    amount,
    type,
    status,
    reference_type,
    reference_id,
    meta
  ) VALUES (
    NULL,
    v_user_acc,
    _amount,
    'deposit',
    'posted',
    _reference_type,
    _reference_id,
    _meta
  ) RETURNING id INTO v_tx;

  RETURN v_tx;
END;
$$;

-- Register team for tournament with optional TorneCoins fee + escrow.
CREATE OR REPLACE FUNCTION public.register_team_for_tournament(
  _tournament_id text,
  _team_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_t record;
  v_team record;
  v_fee int;
  v_registration_id text;
  v_user_acc uuid;
  v_escrow_acc uuid;
  v_tx uuid;
  v_invited jsonb;
  v_invited_tags text[];
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.is_team_admin(v_uid, _team_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT * INTO v_t
  FROM public.tournaments
  WHERE id::text = _tournament_id;

  IF v_t IS NULL THEN
    RAISE EXCEPTION 'tournament_not_found';
  END IF;

  SELECT id, tag, name INTO v_team
  FROM public.teams
  WHERE id::text = _team_id;

  IF v_team IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  -- Private tag restriction
  IF COALESCE(v_t.is_private, false) = true THEN
    v_invited := COALESCE(v_t.invited_tags, '[]'::jsonb);
    SELECT array_agg(upper(trim(value::text)))
      INTO v_invited_tags
    FROM jsonb_array_elements_text(v_invited) AS value
    WHERE trim(value::text) <> '';

    IF v_team.tag IS NULL OR upper(trim(v_team.tag)) <> ANY(COALESCE(v_invited_tags, ARRAY[]::text[])) THEN
      RAISE EXCEPTION 'private_tournament_not_invited';
    END IF;
  END IF;

  -- Dedupe registration
  SELECT id INTO v_registration_id
  FROM public.tournament_registrations
  WHERE tournament_id::text = _tournament_id
    AND team_id::text = _team_id
  LIMIT 1;

  IF v_registration_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_registered', true, 'registration_id', v_registration_id);
  END IF;

  v_fee := COALESCE(v_t.entry_fee_coins, 0);
  IF v_fee < 0 THEN
    v_fee := 0;
  END IF;

  v_registration_id := gen_random_uuid()::text;

  -- If paid, move coins from user -> tournament escrow (frozen)
  IF v_fee > 0 THEN
    v_user_acc := public.tornecoin_get_or_create_account('user', v_uid);
    v_escrow_acc := public.tornecoin_get_or_create_account('tournament_escrow', _tournament_id);

    v_tx := public.tornecoin_transfer_available(
      v_user_acc,
      v_escrow_acc,
      v_fee,
      'entry_fee',
      'tournament_registration',
      v_registration_id,
      jsonb_build_object('tournament_id', _tournament_id, 'team_id', _team_id)
    );
  END IF;

  INSERT INTO public.tournament_registrations (
    id,
    tournament_id,
    team_id,
    status,
    paid_amount_coins,
    created_at
  ) VALUES (
    v_registration_id,
    _tournament_id,
    _team_id,
    'confirmed',
    v_fee,
    now()::text
  );

  RETURN jsonb_build_object(
    'ok', true,
    'registration_id', v_registration_id,
    'paid_amount_coins', v_fee
  );
END;
$$;

-- Grants: keep functions callable by authenticated
REVOKE ALL ON FUNCTION public.tornecoin_get_or_create_account(public.tornecoin_owner_type, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tornecoin_transfer_available(uuid, uuid, int, public.tornecoin_tx_type, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tornecoin_credit_user(text, int, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_team_for_tournament(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.tornecoin_get_or_create_account(public.tornecoin_owner_type, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tornecoin_transfer_available(uuid, uuid, int, public.tornecoin_tx_type, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_team_for_tournament(text, text) TO authenticated;

-- NOTE: tornecoin_credit_user intentionally NOT granted to authenticated (admin-only via SQL/service).
