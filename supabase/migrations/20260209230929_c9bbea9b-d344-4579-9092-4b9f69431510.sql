-- Admin finance summary using SQL aggregates (avoids PostgREST aggregate restrictions)
CREATE OR REPLACE FUNCTION public.admin_finance_summary()
RETURNS TABLE (
  gross numeric,
  fees numeric,
  net numeric,
  pending numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tx AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE status = 'posted' AND type IN ('deposit','entry_fee')), 0) AS gross,
      COALESCE(SUM(amount) FILTER (WHERE status = 'posted' AND type = 'fee'), 0) AS fees
    FROM public.tornecoin_transactions
  ),
  pend AS (
    SELECT
      COALESCE(SUM(balance_pending), 0) AS pending
    FROM public.tornecoin_accounts
    WHERE owner_type IN ('organizer','training_escrow','tournament_escrow')
  )
  SELECT
    tx.gross,
    tx.fees,
    (tx.gross - tx.fees) AS net,
    pend.pending
  FROM tx, pend;
$$;

REVOKE ALL ON FUNCTION public.admin_finance_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary() TO service_role;