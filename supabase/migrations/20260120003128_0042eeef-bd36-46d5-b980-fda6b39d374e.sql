-- Follow system
create table if not exists public.organizer_follows (
  id uuid primary key default gen_random_uuid(),
  organizer_id text not null,
  follower_id text not null,
  created_at timestamptz not null default now(),
  unique (organizer_id, follower_id)
);

alter table public.organizer_follows enable row level security;

create policy "Users can follow organizers"
on public.organizer_follows
for insert
to authenticated
with check ((auth.uid())::text = follower_id);

create policy "Users can unfollow organizers"
on public.organizer_follows
for delete
to authenticated
using ((auth.uid())::text = follower_id);

create policy "Users can view their follows"
on public.organizer_follows
for select
to authenticated
using ((auth.uid())::text = follower_id);

-- Public counts view (no follower identities)
create or replace view public.vw_organizer_follow_counts as
select organizer_id, count(*)::int as followers_count
from public.organizer_follows
group by organizer_id;

-- Waitlist
create table if not exists public.training_waitlist (
  id uuid primary key default gen_random_uuid(),
  training_id text not null,
  team_id text not null,
  created_at timestamptz not null default now(),
  status text not null default 'active',
  unique (training_id, team_id)
);

alter table public.training_waitlist enable row level security;

-- Check-ins
create table if not exists public.training_checkins (
  id uuid primary key default gen_random_uuid(),
  training_id text not null,
  team_id text not null,
  checked_in_at timestamptz not null default now(),
  checked_in_by text not null,
  unique (training_id, team_id)
);

alter table public.training_checkins enable row level security;

-- Notification dedupe per training
create table if not exists public.training_notifications (
  id uuid primary key default gen_random_uuid(),
  training_id text not null,
  type text not null,
  sent_at timestamptz not null default now(),
  unique (training_id, type)
);

alter table public.training_notifications enable row level security;

-- Helper: team admin (owner OR accepted invite with permission=admin)
create or replace function public.is_team_admin(_user_id text, _team_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = _team_id and t.owner_id = _user_id
  )
  or exists (
    select 1 from public.team_invites i
    where i.team_id = _team_id
      and i.invited_user_id = _user_id
      and i.status = 'accepted'
      and i.permission = 'admin'
  );
$$;

-- Policies using the helper
create policy "Team admins can manage waitlist"
on public.training_waitlist
for all
to authenticated
using (public.is_team_admin((auth.uid())::text, team_id))
with check (public.is_team_admin((auth.uid())::text, team_id));

create policy "Team admins can manage checkins"
on public.training_checkins
for all
to authenticated
using (public.is_team_admin((auth.uid())::text, team_id))
with check (public.is_team_admin((auth.uid())::text, team_id));

-- training_notifications: only service role via edge functions should write; deny client by default
create policy "No client access to training_notifications"
on public.training_notifications
for select
to authenticated
using (false);

create policy "No client writes to training_notifications"
on public.training_notifications
for insert
to authenticated
with check (false);

create policy "No client updates to training_notifications"
on public.training_notifications
for update
to authenticated
using (false)
with check (false);

create policy "No client deletes to training_notifications"
on public.training_notifications
for delete
to authenticated
using (false);

-- Indexes
create index if not exists idx_training_waitlist_training on public.training_waitlist (training_id);
create index if not exists idx_training_checkins_training on public.training_checkins (training_id);
create index if not exists idx_organizer_follows_org on public.organizer_follows (organizer_id);
