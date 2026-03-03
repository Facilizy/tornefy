-- Linter: add explicit RLS policy (deny-all) for service-only table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tornecoin_stripe_topups'
      AND policyname = 'deny_all'
  ) THEN
    CREATE POLICY deny_all
    ON public.tornecoin_stripe_topups
    AS RESTRICTIVE
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;
