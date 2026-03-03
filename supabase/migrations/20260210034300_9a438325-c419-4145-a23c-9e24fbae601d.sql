-- Ensure unique slug for frames (needed for idempotent get_or_create)
create unique index if not exists player_card_frames_slug_key
on public.player_card_frames (slug);

-- Auto-generated team frame (stored in player_card_frames.meta)
create or replace function public.get_or_create_team_frame(_team_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := 'team_' || _team_id;
  v_id uuid;
  v_team record;
begin
  select id into v_id
  from public.player_card_frames
  where slug = v_slug
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select id, name, tag, primary_color, secondary_color
  into v_team
  from public.teams
  where id::text = _team_id
  limit 1;

  if v_team.id is null then
    raise exception 'team_not_found';
  end if;

  insert into public.player_card_frames (
    slug,
    name,
    rarity,
    accent_hsl,
    border_hsl,
    background_hsl,
    meta
  ) values (
    v_slug,
    coalesce(v_team.name, 'Meu time') || coalesce(' [' || v_team.tag || ']', ''),
    'common',
    null,
    null,
    null,
    jsonb_build_object(
      'kind', 'team',
      'team_id', _team_id,
      'primary_hex', v_team.primary_color,
      'secondary_hex', v_team.secondary_color
    )
  )
  returning id into v_id;

  return v_id;
end;
$$;