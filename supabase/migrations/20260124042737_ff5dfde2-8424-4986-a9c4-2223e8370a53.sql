-- Backfill missing team_members.id (legacy rows)
ALTER TABLE public.team_members
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE public.team_members
SET id = gen_random_uuid()
WHERE id IS NULL;

-- Backfill training_player_stats.team_member_id when missing (match by team_id + player_name)
WITH candidates AS (
  SELECT
    s.id AS stat_id,
    (
      SELECT tm.id
      FROM public.team_members tm
      WHERE tm.team_id = s.team_id
        AND tm.player_name = s.player_name
        AND tm.user_id IS NOT NULL
        AND tm.id IS NOT NULL
      LIMIT 1
    ) AS member_id
  FROM public.training_player_stats s
  WHERE s.team_member_id IS NULL
)
UPDATE public.training_player_stats s
SET team_member_id = c.member_id
FROM candidates c
WHERE s.id = c.stat_id
  AND c.member_id IS NOT NULL;

-- Mark organizer as verified by email (user_roles has UNIQUE(user_id))
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT u.id INTO v_uid
  FROM auth.users u
  WHERE lower(u.email) = lower('viniciusmartinsantana@gmail.com')
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users', 'viniciusmartinsantana@gmail.com';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (id, user_id, role, assigned_at)
  VALUES (gen_random_uuid(), v_uid::text, 'organizer_verified', now())
  ON CONFLICT (user_id)
  DO UPDATE SET role = EXCLUDED.role, assigned_at = EXCLUDED.assigned_at;
END $$;