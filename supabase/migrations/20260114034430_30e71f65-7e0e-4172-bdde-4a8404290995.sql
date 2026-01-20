-- Update handle_new_user to also store username and preferred_games from raw_user_meta_data
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
$function$;