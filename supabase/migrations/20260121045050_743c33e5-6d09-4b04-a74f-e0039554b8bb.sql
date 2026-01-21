-- Twitch OAuth connections (tokens stored server-side; no client access)
create table if not exists public.twitch_connections (
  user_id text primary key,
  twitch_user_id text not null,
  twitch_login text not null,
  twitch_display_name text,
  access_token text not null,
  refresh_token text not null,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.twitch_connections enable row level security;

-- No client read/write for tokens
create policy "No client select twitch_connections"
on public.twitch_connections
for select
using (false);

create policy "No client insert twitch_connections"
on public.twitch_connections
for insert
with check (false);

create policy "No client update twitch_connections"
on public.twitch_connections
for update
using (false)
with check (false);

create policy "No client delete twitch_connections"
on public.twitch_connections
for delete
using (false);

-- OAuth state table (server-side only)
create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  state text not null unique,
  redirect_to text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_states_user_provider on public.oauth_states (user_id, provider);
create index if not exists idx_oauth_states_expires_at on public.oauth_states (expires_at);

alter table public.oauth_states enable row level security;

create policy "No client access oauth_states_select" on public.oauth_states for select using (false);
create policy "No client access oauth_states_insert" on public.oauth_states for insert with check (false);
create policy "No client access oauth_states_update" on public.oauth_states for update using (false) with check (false);
create policy "No client access oauth_states_delete" on public.oauth_states for delete using (false);

-- Live status cache (publicly readable)
create table if not exists public.twitch_live_status (
  user_id text primary key,
  twitch_login text not null,
  is_live boolean not null default false,
  title text,
  game_name text,
  viewer_count integer,
  thumbnail_url text,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.twitch_live_status enable row level security;

create policy "Twitch live status is publicly visible"
on public.twitch_live_status
for select
using (true);

-- Only server updates
create policy "No client writes twitch_live_status_insert"
on public.twitch_live_status
for insert
with check (false);

create policy "No client writes twitch_live_status_update"
on public.twitch_live_status
for update
using (false)
with check (false);

create policy "No client writes twitch_live_status_delete"
on public.twitch_live_status
for delete
using (false);

-- updated_at trigger support
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_twitch_connections_updated_at'
  ) then
    create trigger set_twitch_connections_updated_at
    before update on public.twitch_connections
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_twitch_live_status_updated_at'
  ) then
    create trigger set_twitch_live_status_updated_at
    before update on public.twitch_live_status
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;