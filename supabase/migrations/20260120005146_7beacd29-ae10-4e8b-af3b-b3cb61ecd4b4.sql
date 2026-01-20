-- Waitlist slot claim (first to click) + check-in time window + internal state tables

-- 1) Ensure RLS enabled where needed
alter table if exists public.training_checkins enable row level security;
alter table if exists public.training_waitlist enable row level security;
alter table if exists public.training_notifications enable row level security;

-- 2) Internal state to avoid spamming "vaga aberta" notifications
create table if not exists public.training_slot_state (
  training_id text primary key,
  last_is_full boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.training_slot_state enable row level security;

-- No client access to training_slot_state
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_slot_state' AND policyname='No client access to training_slot_state_select'
  ) THEN
    CREATE POLICY "No client access to training_slot_state_select"
    ON public.training_slot_state
    FOR SELECT
    USING (false);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_slot_state' AND policyname='No client access to training_slot_state_insert'
  ) THEN
    CREATE POLICY "No client access to training_slot_state_insert"
    ON public.training_slot_state
    FOR INSERT
    WITH CHECK (false);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_slot_state' AND policyname='No client access to training_slot_state_update'
  ) THEN
    CREATE POLICY "No client access to training_slot_state_update"
    ON public.training_slot_state
    FOR UPDATE
    USING (false)
    WITH CHECK (false);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_slot_state' AND policyname='No client access to training_slot_state_delete'
  ) THEN
    CREATE POLICY "No client access to training_slot_state_delete"
    ON public.training_slot_state
    FOR DELETE
    USING (false);
  END IF;
END $$;

-- 3) Tighten training_checkins rules: team admin + time window (opens 1h before, closes 10 min before)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_checkins' AND policyname='Team admins can manage checkins'
  ) THEN
    DROP POLICY "Team admins can manage checkins" ON public.training_checkins;
  END IF;
END $$;

-- Allow team admins to view checkins for their team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_checkins' AND policyname='Team admins can view their checkins'
  ) THEN
    CREATE POLICY "Team admins can view their checkins"
    ON public.training_checkins
    FOR SELECT
    USING (public.is_team_admin((auth.uid())::text, team_id));
  END IF;
END $$;

-- Allow inserting check-in only during the window
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_checkins' AND policyname='Team admins can check in during window'
  ) THEN
    CREATE POLICY "Team admins can check in during window"
    ON public.training_checkins
    FOR INSERT
    WITH CHECK (
      public.is_team_admin((auth.uid())::text, team_id)
      AND EXISTS (
        SELECT 1
        FROM public.trainings t
        WHERE t.id = training_id
          AND t.datetime IS NOT NULL
          AND now() >= (t.datetime - interval '1 hour')
          AND now() <= (t.datetime - interval '10 minutes')
      )
    );
  END IF;
END $$;

-- Allow deleting a check-in (optional) during the window
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_checkins' AND policyname='Team admins can undo checkin during window'
  ) THEN
    CREATE POLICY "Team admins can undo checkin during window"
    ON public.training_checkins
    FOR DELETE
    USING (
      public.is_team_admin((auth.uid())::text, team_id)
      AND EXISTS (
        SELECT 1
        FROM public.trainings t
        WHERE t.id = training_id
          AND t.datetime IS NOT NULL
          AND now() >= (t.datetime - interval '1 hour')
          AND now() <= (t.datetime - interval '10 minutes')
      )
    );
  END IF;
END $$;

-- 4) Atomic slot claim from waitlist ("primeiro que clicar entra")
create or replace function public.claim_waitlist_slot(
  _training_id text,
  _team_id text,
  _line_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
  v_max_slots int;
  v_count int;
  v_slot int;
  v_new_id text;
  v_used int[];
begin
  v_user_id := (auth.uid())::text;
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_team_admin(v_user_id, _team_id) then
    raise exception 'Not allowed';
  end if;

  -- Lock per training to avoid race conditions
  perform pg_advisory_xact_lock(hashtext(_training_id));

  select coalesce(t.max_slots, 0)::int
    into v_max_slots
  from public.trainings t
  where t.id = _training_id;

  if v_max_slots <= 0 then
    raise exception 'Training max slots not configured';
  end if;

  select count(*)::int
    into v_count
  from public.training_registrations r
  where r.training_id = _training_id;

  if v_count >= v_max_slots then
    raise exception 'Training is full';
  end if;

  select array_agg(r.slot_number order by r.slot_number)
    into v_used
  from public.training_registrations r
  where r.training_id = _training_id
    and r.slot_number is not null;

  -- find first available slot
  v_slot := 1;
  for v_slot in 1..v_max_slots loop
    if v_used is null or not (v_slot = any(v_used)) then
      exit;
    end if;
  end loop;

  -- must be on waitlist
  if not exists (
    select 1 from public.training_waitlist w
    where w.training_id = _training_id
      and w.team_id = _team_id
      and w.status = 'active'
  ) then
    raise exception 'Team is not in waitlist';
  end if;

  v_new_id := gen_random_uuid()::text;

  insert into public.training_registrations (id, training_id, team_id, slot_number, line_id)
  values (v_new_id, _training_id, _team_id, v_slot, _line_id);

  delete from public.training_waitlist
  where training_id = _training_id
    and team_id = _team_id;

  return jsonb_build_object(
    'ok', true,
    'registration_id', v_new_id,
    'slot_number', v_slot
  );
end;
$$;

grant execute on function public.claim_waitlist_slot(text, text, uuid) to anon;
grant execute on function public.claim_waitlist_slot(text, text, uuid) to authenticated;
