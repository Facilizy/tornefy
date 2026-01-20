-- Mark specific user as verified organizer
-- Ensure profile role is organizer and user_roles has organizer role
UPDATE public.profiles
SET role = 'organizer', updated_at = now()
WHERE id = 'bd05fd0a-0bdc-4309-9575-ae1f781f0310';

INSERT INTO public.user_roles (user_id, role, assigned_at)
VALUES ('bd05fd0a-0bdc-4309-9575-ae1f781f0310', 'organizer', now())
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, assigned_at = EXCLUDED.assigned_at;