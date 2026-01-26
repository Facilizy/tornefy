-- FIX: Postgres não suporta CREATE POLICY IF NOT EXISTS.

-- 1) Função pública para detectar organizador (não-verificado também)
create or replace function public.is_organizer(_user_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role in ('organizer', 'organizer_verified')
  );
$$;

-- 2) Popups educativos/motivacionais
create table if not exists public.educational_popups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  active boolean not null default true,
  kind text not null default 'educational',

  title text not null,
  description text null,
  cta_label text not null default 'Entendi',

  svg_markup text null,

  starts_at timestamptz null,
  ends_at timestamptz null,

  audience text not null default 'authenticated'
);

create index if not exists idx_educational_popups_active on public.educational_popups(active);
create index if not exists idx_educational_popups_kind on public.educational_popups(kind);
create index if not exists idx_educational_popups_starts_at on public.educational_popups(starts_at);

-- 3) Registro de dismiss por usuário
create table if not exists public.user_popup_dismissals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  popup_id uuid not null references public.educational_popups(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  unique (user_id, popup_id)
);

create index if not exists idx_user_popup_dismissals_user on public.user_popup_dismissals(user_id);
create index if not exists idx_user_popup_dismissals_popup on public.user_popup_dismissals(popup_id);

-- RLS
alter table public.educational_popups enable row level security;
alter table public.user_popup_dismissals enable row level security;

-- Policies (idempotentes)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'educational_popups'
      and policyname = 'educational_popups_select_authenticated'
  ) then
    create policy "educational_popups_select_authenticated"
    on public.educational_popups
    for select
    to authenticated
    using (
      active = true
      and audience = 'authenticated'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_popup_dismissals'
      and policyname = 'user_popup_dismissals_select_own'
  ) then
    create policy "user_popup_dismissals_select_own"
    on public.user_popup_dismissals
    for select
    to authenticated
    using (auth.uid()::text = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_popup_dismissals'
      and policyname = 'user_popup_dismissals_insert_own'
  ) then
    create policy "user_popup_dismissals_insert_own"
    on public.user_popup_dismissals
    for insert
    to authenticated
    with check (auth.uid()::text = user_id);
  end if;
end
$$;

-- Trigger updated_at (idempotente)
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'educational_popups_set_updated_at'
  ) then
    create trigger educational_popups_set_updated_at
    before update on public.educational_popups
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;
