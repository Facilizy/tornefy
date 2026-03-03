-- =============================
-- Torneios (MVP) + RLS
-- =============================

-- 1) Base: updated_at helper (idempotente)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) tournaments
create table if not exists public.tournaments (
  id text primary key default (gen_random_uuid())::text,
  organizer_id text not null,
  name text not null,
  banner_url text,
  datetime timestamptz,
  game text,
  platform text,
  mode text,
  rules text,
  important_info text,
  status text not null default 'draft',
  is_private boolean not null default false,
  invited_tags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tournaments_datetime on public.tournaments(datetime);
create index if not exists idx_tournaments_organizer on public.tournaments(organizer_id);

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;

-- Público: visualizar torneios
-- (no futuro podemos filtrar por status, mas para MVP: listar tudo)
create policy "Tournaments are viewable by everyone"
on public.tournaments
for select
using (true);

-- Organizador: criar/editar/apagar seus torneios
create policy "Organizers can create their tournaments"
on public.tournaments
for insert
with check ((auth.uid())::text = organizer_id);

create policy "Organizers can update their tournaments"
on public.tournaments
for update
using ((auth.uid())::text = organizer_id)
with check ((auth.uid())::text = organizer_id);

create policy "Organizers can delete their tournaments"
on public.tournaments
for delete
using ((auth.uid())::text = organizer_id);


-- 3) tournament_registrations
create table if not exists public.tournament_registrations (
  id text primary key default (gen_random_uuid())::text,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  status text not null default 'pending',
  paid_amount_coins integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index if not exists idx_tournament_registrations_tournament on public.tournament_registrations(tournament_id);
create index if not exists idx_tournament_registrations_team on public.tournament_registrations(team_id);

alter table public.tournament_registrations enable row level security;

-- Ler inscrições: organizer do torneio ou admins do time (is_team_admin)
create policy "Tournament registrations are viewable by organizer or team admin"
on public.tournament_registrations
for select
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
  or is_team_admin((auth.uid())::text, team_id)
);

-- Inserir inscrição: apenas admin do time
create policy "Team admins can register for tournaments"
on public.tournament_registrations
for insert
with check (
  is_team_admin((auth.uid())::text, team_id)
);

-- Cancelar inscrição: organizer do torneio ou admin do time
create policy "Organizer or team admin can update registration"
on public.tournament_registrations
for update
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
  or is_team_admin((auth.uid())::text, team_id)
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
  or is_team_admin((auth.uid())::text, team_id)
);

-- Delete: só organizer do torneio (evita apagar histórico pelo time)
create policy "Organizer can delete tournament registrations"
on public.tournament_registrations
for delete
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
);


-- 4) tournament_groups
create table if not exists public.tournament_groups (
  id text primary key default (gen_random_uuid())::text,
  tournament_id text not null references public.tournaments(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tournament_groups_tournament on public.tournament_groups(tournament_id);

alter table public.tournament_groups enable row level security;

-- Ler grupos: público (para exibir na página do torneio)
create policy "Tournament groups are viewable by everyone"
on public.tournament_groups
for select
using (true);

-- Mutação: só organizer do torneio
create policy "Organizer can manage tournament groups"
on public.tournament_groups
for all
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_groups.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_groups.tournament_id
      and t.organizer_id = (auth.uid())::text
  )
);


-- 5) tournament_group_teams
create table if not exists public.tournament_group_teams (
  id text primary key default (gen_random_uuid())::text,
  group_id text not null references public.tournament_groups(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  seed integer,
  created_at timestamptz not null default now(),
  unique (group_id, team_id)
);

create index if not exists idx_tournament_group_teams_group on public.tournament_group_teams(group_id);
create index if not exists idx_tournament_group_teams_team on public.tournament_group_teams(team_id);

alter table public.tournament_group_teams enable row level security;

-- Ler alocações: público
create policy "Tournament group teams are viewable by everyone"
on public.tournament_group_teams
for select
using (true);

-- Mutação: só organizer do torneio (via join group->tournament)
create policy "Organizer can manage tournament group teams"
on public.tournament_group_teams
for all
using (
  exists (
    select 1
    from public.tournament_groups g
    join public.tournaments t on t.id = g.tournament_id
    where g.id = tournament_group_teams.group_id
      and t.organizer_id = (auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.tournament_groups g
    join public.tournaments t on t.id = g.tournament_id
    where g.id = tournament_group_teams.group_id
      and t.organizer_id = (auth.uid())::text
  )
);
