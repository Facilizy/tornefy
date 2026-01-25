-- Admin audit logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  request JSONB,
  before JSONB,
  after JSONB,
  response_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: only service-role (Edge Function) should read/write.

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON public.admin_audit_logs (actor_id, created_at DESC);

-- Soft delete columns
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

CREATE INDEX IF NOT EXISTS idx_trainings_deleted_at ON public.trainings (deleted_at);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON public.teams (deleted_at);

-- Allow multiple roles per user (critical for admin+organizer_verified etc.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public'
      AND t.relname='user_roles'
      AND c.conname='user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_key;
  END IF;
END$$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Keep signup behavior but compatible with multi-role
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
  user_full_name text;
  user_username text;
  user_preferred_games jsonb;
BEGIN
  -- Extract fields from raw_user_meta_data
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  user_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  user_preferred_games := COALESCE(NEW.raw_user_meta_data->'preferred_games', '["free_fire"]'::jsonb);

  -- Create profile entry
  INSERT INTO public.profiles (id, full_name, role, username, preferred_games, created_at, updated_at)
  VALUES (
    NEW.id,
    user_full_name,
    user_role,
    user_username,
    user_preferred_games,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user_roles entry (multi-role safe)
  INSERT INTO public.user_roles (user_id, role, assigned_at)
  VALUES (
    NEW.id,
    user_role::text,
    NOW()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;