-- 1) Novas colunas em organizer_subscription_plans
ALTER TABLE public.organizer_subscription_plans
ADD COLUMN IF NOT EXISTS period_days integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS benefits_text text NULL,
ADD COLUMN IF NOT EXISTS max_subscribers integer NULL;

-- 2) Atualiza RPC subscribe_to_plan para usar period_days e aplicar max_subscribers
CREATE OR REPLACE FUNCTION public.subscribe_to_plan(_plan_id uuid)
RETURNS public.organizer_plan_memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_period_days integer;
  v_available_at timestamptz;
  v_active_subscribers integer;
begin
  v_user_id := auth.uid()::text;
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Lock plan row to avoid race conditions for max_subscribers
  select * into v_plan
  from public.organizer_subscription_plans p
  where p.id = _plan_id
    and p.active = true
  for update;

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

  -- Plan duration validation
  v_period_days := coalesce(v_plan.period_days, 30);
  if v_period_days <= 0 or v_period_days > 365 then
    raise exception 'plan_period_invalid';
  end if;
  v_available_at := v_now + (v_period_days || ' days')::interval;

  -- If already active (still in period), block (manual renew only after expiry)
  select * into v_membership
  from public.organizer_plan_memberships m
  where m.plan_id = _plan_id
    and m.user_id = v_user_id
  limit 1;

  if found and v_membership.status = 'active' and v_membership.current_period_end > v_now then
    raise exception 'already_active';
  end if;

  -- Max subscribers limit (active memberships only)
  if v_plan.max_subscribers is not null and v_plan.max_subscribers > 0 then
    select count(*)::int into v_active_subscribers
    from public.organizer_plan_memberships m
    where m.plan_id = _plan_id
      and m.status = 'active'
      and m.current_period_end > v_now;

    if v_active_subscribers >= v_plan.max_subscribers then
      raise exception 'plan_full';
    end if;
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
      _plan_id, v_plan.organizer_id, v_user_id, 'active', v_now, v_now + (v_period_days || ' days')::interval
    )
    returning * into v_membership;
  else
    update public.organizer_plan_memberships
    set status = 'active',
        organizer_id = v_plan.organizer_id,
        current_period_start = v_now,
        current_period_end = v_now + (v_period_days || ' days')::interval
    where id = v_membership.id
    returning * into v_membership;
  end if;

  -- Movimentações
  -- 1) Mensalidade (vai para o organizador como PENDENTE +period_days)
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
$function$;