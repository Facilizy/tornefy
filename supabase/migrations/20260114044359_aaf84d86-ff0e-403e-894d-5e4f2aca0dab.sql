ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id text;

-- Opcional: no change to RLS yet, owners continuam gerenciando membros normalmente.