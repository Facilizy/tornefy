-- Fix teams.id not-null violation by adding a default value
ALTER TABLE public.teams
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;