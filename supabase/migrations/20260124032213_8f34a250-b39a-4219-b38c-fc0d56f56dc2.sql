-- Fix legacy team_invites columns that were created as nullable text
-- 1) Ensure id exists and is not null (kept as text for compatibility)
UPDATE public.team_invites
SET id = gen_random_uuid()::text
WHERE id IS NULL OR id = '';

ALTER TABLE public.team_invites
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.team_invites
ALTER COLUMN id SET NOT NULL;

-- 2) Convert created_at from text -> timestamptz and make it non-null
ALTER TABLE public.team_invites
ALTER COLUMN created_at TYPE timestamptz
USING (
  CASE
    WHEN created_at IS NULL OR created_at = '' THEN NULL
    ELSE created_at::timestamptz
  END
);

UPDATE public.team_invites
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.team_invites
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.team_invites
ALTER COLUMN created_at SET NOT NULL;

-- 3) Convert updated_at from text -> timestamptz and make it non-null
ALTER TABLE public.team_invites
ALTER COLUMN updated_at TYPE timestamptz
USING (
  CASE
    WHEN updated_at IS NULL OR updated_at = '' THEN NULL
    ELSE updated_at::timestamptz
  END
);

UPDATE public.team_invites
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.team_invites
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.team_invites
ALTER COLUMN updated_at SET NOT NULL;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id_created_at
ON public.team_invites (team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_invites_invited_user_id
ON public.team_invites (invited_user_id);
