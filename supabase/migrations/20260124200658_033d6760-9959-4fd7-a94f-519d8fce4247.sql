-- Satisfaz o linter mantendo a tabela inacessível via client (deny-all).
-- Service role (Edge Functions) continua funcionando pois bypassa RLS.

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='admin_audit_logs_deny_select'
  ) THEN
    CREATE POLICY admin_audit_logs_deny_select
    ON public.admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (false);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='admin_audit_logs_deny_insert'
  ) THEN
    CREATE POLICY admin_audit_logs_deny_insert
    ON public.admin_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (false);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='admin_audit_logs_deny_update'
  ) THEN
    CREATE POLICY admin_audit_logs_deny_update
    ON public.admin_audit_logs
    FOR UPDATE
    TO authenticated
    USING (false);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='admin_audit_logs_deny_delete'
  ) THEN
    CREATE POLICY admin_audit_logs_deny_delete
    ON public.admin_audit_logs
    FOR DELETE
    TO authenticated
    USING (false);
  END IF;
END $$;