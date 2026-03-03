-- Subscription plans (TorneCoins)

-- 1) Helper: updated_at trigger function (idempotent)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Plans table
create table if not exists public.organizer_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  organizer_id text not null,
  name text not null,
  description text null,
  monthly_fee_coins integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizer_subscription_plans_organizer_id_idx
  on public.organizer_subscription_plans (organizer_id);

create trigger organizer_subscription_plans_set_updated_at
before update on public.organizer_subscription_plans
for each row execute function public.update_updated_at_column();

alter table public.organizer_subscription_plans enable row level security;

create policy "Plans are viewable by everyone"
on public.organizer_subscription_plans
for select
using (true);

create policy "Organizers can create their own plans"
on public.organizer_subscription_plans
for insert
to authenticated
with check (auth.uid()::text = organizer_id);

create policy "Organizers can update their own plans"
on public.organizer_subscription_plans
for update
to authenticated
using (auth.uid()::text = organizer_id)
with check (auth.uid()::text = organizer_id);

create policy "Organizers can delete their own plans"
on public.organizer_subscription_plans
for delete
to authenticated
using (auth.uid()::text = organizer_id);

-- 3) Memberships table
create table if not exists public.organizer_plan_memberships (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.organizer_subscription_plans(id) on delete cascade,
  organizer_id text not null,
  user_id text not null,
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, user_id)
);

create index if not exists organizer_plan_memberships_user_id_idx
  on public.organizer_plan_memberships (user_id);
create index if not exists organizer_plan_memberships_organizer_id_idx
  on public.organizer_plan_memberships (organizer_id);

create trigger organizer_plan_memberships_set_updated_at
before update on public.organizer_plan_memberships
for each row execute function public.update_updated_at_column();

alter table public.organizer_plan_memberships enable row level security;

create policy "Users can view their own memberships"
on public.organizer_plan_memberships
for select
to authenticated
using (auth.uid()::text = user_id);

create policy "Organizers can view memberships of their plans"
on public.organizer_plan_memberships
for select
to authenticated
using (auth.uid()::text = organizer_id);

-- (No direct insert/update/delete from client; use RPC)

-- 4) Trainings: required plan for registration
alter table public.trainings
  add column if not exists required_plan_id uuid null references public.organizer_subscription_plans(id);

create index if not exists trainings_required_plan_id_idx
  on public.trainings (required_plan_id);

-- 5) RPC helpers

-- Get caller membership (avoids RLS headaches in client)
create or replace function public.get_my_plan_membership(_plan_id uuid)
returns public.organizer_plan_memberships
language sql
stable
security definer
set search_path = public
as $$
  select m.*
  from public.organizer_plan_memberships m
  where m.plan_id = _plan_id
    and m.user_id = auth.uid()::text
  limit 1;
$$;

-- Subscribe (manual renewal) via TorneCoins transfers
create or replace function public.subscribe_to_plan(_plan_id uuid)
returns public.organizer_plan_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_plan record;
  v_membership public.organizer_plan_memberships%rowtype;
  v_user_acc_id uuid;
  v_org_acc_id uuid;
  v_platform_acc_id uuid;
  v_fee integer;
  v_net integer;
  v_total integer;
  v_now timestamptz := now();
  v_available_at timestamptz := now() + interval '30 days';
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_plan
  from public.organizer_subscription_plans p
  where p.id = _plan_id
    and p.active = true;

  if not found then
    raise exception 'plan_not_found_or_inactive';
  end if;

  v_total := greatest(0, coalesce(v_plan.monthly_fee_coins, 0));
  if v_total <= 0 then
    raise exception 'plan_fee_invalid';
  end if;

  -- Disallow subscribing to own plan
  if v_plan.organizer_id = v_user_id then
    raise exception 'cannot_subscribe_to_own_plan';
  end if;

  -- If already active (still in period), block
  select * into v_membership
  from public.organizer_plan_memberships m
  where m.plan_id = _plan_id
    and m.user_id = v_user_id
  limit 1;

  if found and v_membership.status = 'active' and v_membership.current_period_end > v_now then
    raise exception 'already_active';
  end if;

  -- Ensure accounts exist
  select id into v_user_acc_id
  from public.tornecoin_accounts
  where owner_type = 'user' and owner_id = v_user_id
  limit 1;

  if v_user_acc_id is null then
    insert into public.tornecoin_accounts (owner_type, owner_id, balance_available, balance_pending, balance_frozen)
    values ('user', v_user_id, 0, 0, 0)
    returning id into v_user_acc_id;
  end if;

  select id into v_org_acc_id
  from public.tornecoin_accounts
  where owner_type = 'organizer' and owner_id = v_plan.organizer_id
  limit 1;

  if v_org_acc_id is null then
    insert into public.tornecoin_accounts (owner_type, owner_id, balance_available, balance_pending, balance_frozen)
    values ('organizer', v_plan.organizer_id, 0, 0, 0)
    returning id into v_org_acc_id;
  end if;

  select id into v_platform_acc_id
  from public.tornecoin_accounts
  where owner_type = 'platform' and owner_id = 'tornefy'
  limit 1;

  if v_platform_acc_id is null then
    insert into public.tornecoin_accounts (owner_type, owner_id, balance_available, balance_pending, balance_frozen)
    values ('platform', 'tornefy', 0, 0, 0)
    returning id into v_platform_acc_id;
  end if;

  -- Lock user balance row
  perform 1
  from public.tornecoin_accounts
  where id = v_user_acc_id
  for update;

  -- Fee: minimum 1 TC + 8% (rounded down), capped to total
  v_fee := greatest(1, floor(v_total * 0.08)::int);
  if v_fee > v_total then v_fee := v_total; end if;
  v_net := v_total - v_fee;

  -- Validate balance
  if (select balance_available from public.tornecoin_accounts where id = v_user_acc_id) < v_total then
    raise exception 'insufficient_funds';
  end if;

  -- Upsert membership
  if v_membership.id is null then
    insert into public.organizer_plan_memberships (
      plan_id, organizer_id, user_id, status, current_period_start, current_period_end
    ) values (
      _plan_id, v_plan.organizer_id, v_user_id, 'active', v_now, v_now + interval '30 days'
    )
    returning * into v_membership;
  else
    update public.organizer_plan_memberships
    set status = 'active',
        organizer_id = v_plan.organizer_id,
        current_period_start = v_now,
        current_period_end = v_now + interval '30 days'
    where id = v_membership.id
    returning * into v_membership;
  end if;

  -- Movimentações
  -- 1) Mensalidade (vai para o organizador como PENDENTE +30d)
  if v_net > 0 then
    insert into public.tornecoin_transactions (
      from_account_id, to_account_id, amount, type, status, service_fee,
      available_at, is_anticipation, reference_type, reference_id, meta
    ) values (
      v_user_acc_id, v_org_acc_id, v_net, 'deposit', 'posted', 0,
      v_available_at, false, 'plan_subscription', v_membership.id::text,
      jsonb_build_object('plan_id', _plan_id::text, 'organizer_id', v_plan.organizer_id, 'total', v_total, 'fee', v_fee)
    );
  end if;

  -- 2) Taxa Tornefy (disponível imediatamente)
  insert into public.tornecoin_transactions (
    from_account_id, to_account_id, amount, type, status, service_fee,
    available_at, is_anticipation, reference_type, reference_id, meta
  ) values (
    v_user_acc_id, v_platform_acc_id, v_fee, 'fee', 'posted', 0,
    null, false, 'plan_fee', v_membership.id::text,
    jsonb_build_object('plan_id', _plan_id::text, 'organizer_id', v_plan.organizer_id, 'total', v_total, 'fee', v_fee)
  );

  -- Update balances
  update public.tornecoin_accounts
  set balance_available = balance_available - v_total
  where id = v_user_acc_id;

  update public.tornecoin_accounts
  set balance_pending = balance_pending + v_net
  where id = v_org_acc_id;

  update public.tornecoin_accounts
  set balance_available = balance_available + v_fee
  where id = v_platform_acc_id;

  return v_membership;
end;
$$;

-- Allow authenticated users to execute the RPCs
grant execute on function public.get_my_plan_membership(uuid) to authenticated;
grant execute on function public.subscribe_to_plan(uuid) to authenticated;
