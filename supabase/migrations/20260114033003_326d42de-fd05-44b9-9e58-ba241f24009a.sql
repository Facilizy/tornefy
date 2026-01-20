-- Backfill existing users who don't have profiles or roles
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
  COALESCE(u.raw_user_meta_data->>'role', 'player') as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET 
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  role = COALESCE(EXCLUDED.role, profiles.role),
  updated_at = NOW();

INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'role', 'player') as role,
  NOW() as assigned_at
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;