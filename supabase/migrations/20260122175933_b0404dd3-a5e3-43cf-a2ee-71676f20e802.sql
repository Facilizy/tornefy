-- 1) Remove duplicate pending invites using ctid (some legacy rows have NULL id)
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, invited_user_id
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.team_invites
  WHERE is_external = 'false'
    AND status = 'pending'
    AND invited_user_id IS NOT NULL
)
DELETE FROM public.team_invites ti
USING ranked r
WHERE ti.ctid = r.ctid
  AND r.rn > 1;

-- 2) Prevent duplicates going forward
CREATE UNIQUE INDEX IF NOT EXISTS team_invites_unique_pending
ON public.team_invites (team_id, invited_user_id)
WHERE (is_external = 'false' AND status = 'pending');
