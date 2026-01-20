create or replace view public.vw_organizer_follow_counts
with (security_invoker = true)
as
select organizer_id, count(*)::int as followers_count
from public.organizer_follows
group by organizer_id;