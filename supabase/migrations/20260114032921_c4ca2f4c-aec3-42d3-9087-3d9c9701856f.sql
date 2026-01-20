-- Step 1: Add necessary constraints and triggers

-- Add primary key to profiles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_pkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    -- First, ensure there are no NULL ids
    DELETE FROM public.profiles WHERE id IS NULL;
    
    ALTER TABLE public.profiles
    ALTER COLUMN id SET NOT NULL;
    
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Set default UUID generation for user_roles id column
ALTER TABLE public.user_roles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add primary key to user_roles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_pkey' AND conrelid = 'public.user_roles'::regclass
  ) THEN
    -- First, ensure there are no NULL ids
    DELETE FROM public.user_roles WHERE id IS NULL;
    
    ALTER TABLE public.user_roles
    ALTER COLUMN id SET NOT NULL;
    
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Add unique constraint on user_id in user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_key' AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
  user_full_name text;
BEGIN
  -- Extract role and full_name from raw_user_meta_data
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Create profile entry
  INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    user_full_name,
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user_roles entry
  INSERT INTO public.user_roles (user_id, role, assigned_at)
  VALUES (
    NEW.id,
    user_role::text,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for automatic profile/role creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();