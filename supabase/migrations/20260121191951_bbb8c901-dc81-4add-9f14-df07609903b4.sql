-- Fix invites workflow: allow invited users to accept/reject, and add optional expiration timestamp

-- Ensure RLS is enabled
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Add expires_at column (nullable). Use timestamptz for correct comparisons.
ALTER TABLE public.team_invites
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Policy: invited users can update their own invite to accepted/rejected (and optionally expired)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='team_invites'
      AND policyname='Invited users can respond to invites'
  ) THEN
    CREATE POLICY "Invited users can respond to invites"
    ON public.team_invites
    FOR UPDATE
    TO authenticated
    USING ((auth.uid())::text = invited_user_id)
    WITH CHECK (
      (auth.uid())::text = invited_user_id
      AND status IN ('accepted','rejected','expired')
    );
  END IF;
END $$;

-- Helpful index for listing invites by target user and status
CREATE INDEX IF NOT EXISTS idx_team_invites_invited_user_status
ON public.team_invites (invited_user_id, status);

-- Helpful index for expiration checks
CREATE INDEX IF NOT EXISTS idx_team_invites_expires_at
ON public.team_invites (expires_at);
