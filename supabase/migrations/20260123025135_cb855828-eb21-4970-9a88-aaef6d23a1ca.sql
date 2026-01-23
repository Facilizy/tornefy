-- Fix: player_function enum does not exist in this DB; use text for team_members.function

CREATE OR REPLACE FUNCTION public.accept_team_invite(_invite_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_invite record;
  v_profile record;
  v_now timestamptz := now();
  v_member_function text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = _invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF v_invite.is_external = 'true' THEN
    RAISE EXCEPTION 'external_invite_cannot_be_accepted';
  END IF;

  IF v_invite.invited_user_id IS NULL OR v_invite.invited_user_id <> v_uid THEN
    RAISE EXCEPTION 'not_invited_user';
  END IF;

  -- Status: treat NULL as pending (legacy)
  IF v_invite.status IS NOT NULL AND v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'invite_not_pending';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < v_now THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  -- Prevent accepting if user already owns a team (keeps current product rule)
  IF EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_id = v_uid) THEN
    RAISE EXCEPTION 'user_already_has_team';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  v_member_function := CASE WHEN v_invite.permission = 'admin' THEN 'CAPITÃO' ELSE 'SUPORTE' END;

  UPDATE public.team_invites
  SET status = 'accepted', updated_at = v_now::text
  WHERE id = _invite_id;

  INSERT INTO public.team_members (team_id, user_id, player_name, game_id, discord, function)
  VALUES (
    v_invite.team_id,
    v_uid,
    COALESCE(v_profile.full_name, v_profile.username, 'Jogador'),
    v_uid,
    COALESCE(v_profile.discord_contact, ''),
    v_member_function
  );

  RETURN json_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('ok', true, 'warning', 'already_member');
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
