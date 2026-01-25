-- Verified entities (users/teams) for public “verified” badge
-- Create enum for entity types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verified_entity_type') THEN
    CREATE TYPE public.verified_entity_type AS ENUM ('user', 'team');
  END IF;
END $$;

-- Create table
CREATE TABLE IF NOT EXISTS public.verified_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.verified_entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.verified_entities ENABLE ROW LEVEL SECURITY;

-- Public read (so the badge works logged-out)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='verified_entities' AND policyname='Verified entities are publicly readable'
  ) THEN
    CREATE POLICY "Verified entities are publicly readable"
    ON public.verified_entities
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Only verified organizers can manage entries from the client
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='verified_entities' AND policyname='Verified organizers can insert verified entities'
  ) THEN
    CREATE POLICY "Verified organizers can insert verified entities"
    ON public.verified_entities
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_organizer_verified((auth.uid())::text));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='verified_entities' AND policyname='Verified organizers can update verified entities'
  ) THEN
    CREATE POLICY "Verified organizers can update verified entities"
    ON public.verified_entities
    FOR UPDATE
    TO authenticated
    USING (public.is_organizer_verified((auth.uid())::text))
    WITH CHECK (public.is_organizer_verified((auth.uid())::text));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='verified_entities' AND policyname='Verified organizers can delete verified entities'
  ) THEN
    CREATE POLICY "Verified organizers can delete verified entities"
    ON public.verified_entities
    FOR DELETE
    TO authenticated
    USING (public.is_organizer_verified((auth.uid())::text));
  END IF;
END $$;

-- Updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_verified_entities_updated_at ON public.verified_entities;
CREATE TRIGGER update_verified_entities_updated_at
BEFORE UPDATE ON public.verified_entities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC helpers (avoid RLS recursion and allow batch checks)
CREATE OR REPLACE FUNCTION public.is_entity_verified(_entity_type public.verified_entity_type, _entity_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT ve.verified
    FROM public.verified_entities ve
    WHERE ve.entity_type = _entity_type
      AND ve.entity_id = _entity_id
    LIMIT 1
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.get_verified_entities(_entity_type public.verified_entity_type, _entity_ids text[])
RETURNS TABLE(entity_id text, verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ids.entity_id,
         COALESCE(ve.verified, false) AS verified
  FROM unnest(_entity_ids) AS ids(entity_id)
  LEFT JOIN public.verified_entities ve
    ON ve.entity_type = _entity_type
   AND ve.entity_id = ids.entity_id;
$$;