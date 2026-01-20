-- Ensure primary keys exist on teams and trainings so they can be referenced by foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teams_pkey' AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams
    ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trainings_pkey' AND conrelid = 'public.trainings'::regclass
  ) THEN
    ALTER TABLE public.trainings
    ALTER COLUMN id SET NOT NULL;
    ALTER TABLE public.trainings
    ADD CONSTRAINT trainings_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Create training_registrations table if it does not exist
CREATE TABLE IF NOT EXISTS public.training_registrations (
  id text PRIMARY KEY,
  training_id text NOT NULL,
  team_id text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  slot_number integer,
  CONSTRAINT training_registrations_training_team_unique UNIQUE (training_id, team_id)
);

-- Add foreign key relationships for PostgREST to discover
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'training_registrations_training_id_fkey'
  ) THEN
    ALTER TABLE public.training_registrations
    ADD CONSTRAINT training_registrations_training_id_fkey
    FOREIGN KEY (training_id) REFERENCES public.trainings(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'training_registrations_team_id_fkey'
  ) THEN
    ALTER TABLE public.training_registrations
    ADD CONSTRAINT training_registrations_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Ensure team_members is linked to teams so joins like teams(*) , team_members(*) work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'team_members_team_id_fkey'
  ) THEN
    ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Enable RLS on training_registrations with simple, permissive policies for now
ALTER TABLE public.training_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_registrations'
      AND policyname = 'Anyone can view training registrations'
  ) THEN
    CREATE POLICY "Anyone can view training registrations"
      ON public.training_registrations
      FOR SELECT
      USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_registrations'
      AND policyname = 'Authenticated users can manage registrations'
  ) THEN
    CREATE POLICY "Authenticated users can manage registrations"
      ON public.training_registrations
      FOR ALL
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END$$;