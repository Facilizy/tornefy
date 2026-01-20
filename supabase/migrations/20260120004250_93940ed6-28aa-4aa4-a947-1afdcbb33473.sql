-- Public follower count without exposing follower identities
create or replace function public.get_organizer_follow_count(_organizer_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.organizer_follows
  where organizer_id = _organizer_id;
$$;

grant execute on function public.get_organizer_follow_count(text) to anon, authenticated;