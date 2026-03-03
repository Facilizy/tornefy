-- 1) Scrim kind (trainings)
alter table public.trainings
add column if not exists kind text not null default 'training';

create index if not exists idx_trainings_kind_datetime
on public.trainings (kind, datetime);

-- 2) Enum: tornecoin_owner_type adiciona escrow de scrim/training
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'tornecoin_owner_type'
  ) then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname='public'
        and t.typname='tornecoin_owner_type'
        and e.enumlabel='training_escrow'
    ) then
      alter type public.tornecoin_owner_type add value 'training_escrow';
    end if;
  end if;
end $$;

-- 3) Grupos do scrim
create table if not exists public.scrim_groups (
  id text primary key default (gen_random_uuid())::text,
  training_id text not null references public.trainings(id) on delete cascade,
  name text not null,
  locked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.scrim_group_teams (
  id text primary key default (gen_random_uuid())::text,
  group_id text not null references public.scrim_groups(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  seed integer null,
  created_at timestamptz not null default now(),
  unique (group_id, team_id)
);

create index if not exists idx_scrim_groups_training_id on public.scrim_groups(training_id);
create index if not exists idx_scrim_group_teams_group_id on public.scrim_group_teams(group_id);

alter table public.scrim_groups enable row level security;
alter table public.scrim_group_teams enable row level security;

-- Policies (DROP+CREATE para ser idempotente)
drop policy if exists "Scrim groups readable by organizer or admin" on public.scrim_groups;
create policy "Scrim groups readable by organizer or admin"
on public.scrim_groups
for select
to authenticated
using (
  exists (
    select 1
    from public.trainings t
    where t.id = scrim_groups.training_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
);

drop policy if exists "Scrim groups writable by organizer or admin" on public.scrim_groups;
create policy "Scrim groups writable by organizer or admin"
on public.scrim_groups
for all
to authenticated
using (
  exists (
    select 1
    from public.trainings t
    where t.id = scrim_groups.training_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
)
with check (
  exists (
    select 1
    from public.trainings t
    where t.id = scrim_groups.training_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
);

drop policy if exists "Scrim group teams readable by organizer or admin" on public.scrim_group_teams;
create policy "Scrim group teams readable by organizer or admin"
on public.scrim_group_teams
for select
to authenticated
using (
  exists (
    select 1
    from public.scrim_groups g
    join public.trainings t on t.id = g.training_id
    where g.id = scrim_group_teams.group_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
);

drop policy if exists "Scrim group teams writable by organizer or admin" on public.scrim_group_teams;
create policy "Scrim group teams writable by organizer or admin"
on public.scrim_group_teams
for all
to authenticated
using (
  exists (
    select 1
    from public.scrim_groups g
    join public.trainings t on t.id = g.training_id
    where g.id = scrim_group_teams.group_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
)
with check (
  exists (
    select 1
    from public.scrim_groups g
    join public.trainings t on t.id = g.training_id
    where g.id = scrim_group_teams.group_id
      and t.organizer_id = (auth.uid())::text
  )
  or has_role(auth.uid(), 'admin'::text)
);

-- 4) RPC: inscrição paga no scrim (trainings)
create or replace function public.register_team_for_scrim(
  _training_id text,
  _team_id text
)
returns public.training_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_fee integer;
  v_reg public.training_registrations;
  v_user_account_id uuid;
  v_escrow_account_id uuid;
  v_next_slot integer;
  v_training record;
  v_tx_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_team_admin(v_user_id::text, _team_id) then
    raise exception 'not_team_admin';
  end if;

  select t.*, coalesce(t.entry_fee_coins, 0) as fee
  into v_training
  from public.trainings t
  where t.id = _training_id;

  if not found then
    raise exception 'training_not_found';
  end if;

  v_fee := coalesce(v_training.fee, 0);

  if exists (
    select 1
    from public.training_registrations r
    where r.training_id = _training_id
      and r.team_id = _team_id
  ) then
    raise exception 'already_registered';
  end if;

  perform pg_advisory_xact_lock(hashtext(_training_id));

  if v_fee > 0 then
    select a.id
    into v_user_account_id
    from public.tornecoin_accounts a
    where a.owner_type = 'user'::public.tornecoin_owner_type
      and a.owner_id = v_user_id::text
    limit 1
    for update;

    if v_user_account_id is null then
      raise exception 'user_account_not_found';
    end if;

    insert into public.tornecoin_accounts (owner_type, owner_id)
    select 'training_escrow'::public.tornecoin_owner_type, _training_id
    where not exists (
      select 1
      from public.tornecoin_accounts a
      where a.owner_type = 'training_escrow'::public.tornecoin_owner_type
        and a.owner_id = _training_id
    );

    select a.id
    into v_escrow_account_id
    from public.tornecoin_accounts a
    where a.owner_type = 'training_escrow'::public.tornecoin_owner_type
      and a.owner_id = _training_id
    limit 1
    for update;

    if v_escrow_account_id is null then
      raise exception 'escrow_account_not_found';
    end if;

    if (select balance_available from public.tornecoin_accounts where id = v_user_account_id) < v_fee then
      raise exception 'insufficient_funds';
    end if;

    update public.tornecoin_accounts
    set balance_available = balance_available - v_fee,
        updated_at = now()
    where id = v_user_account_id;

    update public.tornecoin_accounts
    set balance_pending = balance_pending + v_fee,
        updated_at = now()
    where id = v_escrow_account_id;

    v_tx_id := gen_random_uuid();
    insert into public.tornecoin_transactions (
      id, from_account_id, to_account_id, amount, type, status, service_fee, meta, reference_type, reference_id
    ) values (
      v_tx_id,
      v_user_account_id,
      v_escrow_account_id,
      v_fee,
      'entry_fee'::public.tornecoin_tx_type,
      'posted'::public.tornecoin_tx_status,
      0,
      jsonb_build_object('training_id', _training_id, 'team_id', _team_id),
      'training',
      _training_id
    );
  end if;

  select coalesce(max(r.slot_number), 0) + 1
  into v_next_slot
  from public.training_registrations r
  where r.training_id = _training_id;

  insert into public.training_registrations (training_id, team_id, paid_amount_coins, slot_number)
  values (_training_id, _team_id, v_fee, v_next_slot)
  returning * into v_reg;

  return v_reg;
end;
$$;

revoke all on function public.register_team_for_scrim(text, text) from public;
grant execute on function public.register_team_for_scrim(text, text) to authenticated;
