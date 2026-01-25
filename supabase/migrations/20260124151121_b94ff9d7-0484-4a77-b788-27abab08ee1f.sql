-- Fix: user_roles.user_id is stored as text in this project; keep public function signature compatible.

-- Public-safe view for verification status (no notes/verified_by exposure)
CREATE OR REPLACE VIEW public.verified_entities_public
WITH (security_invoker=on) AS
  SELECT entity_id, entity_type, verified
  FROM public.verified_entities
  WHERE verified = true;

-- Returns TRUE only when the entity has a verified=true row.
CREATE OR REPLACE FUNCTION public.is_entity_verified(
  _entity_type public.verified_entity_type,
  _entity_id text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.verified_entities_public v
    WHERE v.entity_type = _entity_type
      AND v.entity_id = _entity_id
  );
$$;

-- Batch RPC: returns rows only for verified entities; the client treats missing as false.
CREATE OR REPLACE FUNCTION public.get_verified_entities(
  _entity_type public.verified_entity_type,
  _entity_ids text[]
)
RETURNS TABLE(entity_id text, verified boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.entity_id, true as verified
  FROM public.verified_entities_public v
  WHERE v.entity_type = _entity_type
    AND v.entity_id = ANY(_entity_ids);
$$;

-- Organizer verification should also be visible publicly.
-- Note: user_roles.user_id is text, so accept text here.
CREATE OR REPLACE FUNCTION public.is_organizer_verified(_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'organizer_verified'
  );
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.is_entity_verified(public.verified_entity_type, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_entities(public.verified_entity_type, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_organizer_verified(text) TO anon, authenticated;
GRANT SELECT ON public.verified_entities_public TO anon, authenticated;
