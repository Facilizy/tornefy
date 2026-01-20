-- Fix training_registrations inserts that don't provide id
ALTER TABLE public.training_registrations
  ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text);

-- Enforce unique tag for real (non-external) teams
CREATE UNIQUE INDEX IF NOT EXISTS teams_unique_tag_real
  ON public.teams (tag)
  WHERE (is_external = false);

-- Allow owners to truly delete their team (CREATE POLICY has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Team owners can delete their team'
  ) THEN
    EXECUTE 'CREATE POLICY "Team owners can delete their team" ON public.teams FOR DELETE USING ((auth.uid())::text = owner_id)';
  END IF;
END $$;
