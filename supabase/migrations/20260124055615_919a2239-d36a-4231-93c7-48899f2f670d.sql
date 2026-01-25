-- Backfill verified_entities from existing flags (teams.is_verified)
INSERT INTO public.verified_entities (entity_type, entity_id, verified, verified_by, notes)
SELECT 'team'::public.verified_entity_type, t.id::text, true, NULL, 'backfill from teams.is_verified'
FROM public.teams t
WHERE COALESCE(t.is_verified, false) = true
ON CONFLICT (entity_type, entity_id) DO NOTHING;