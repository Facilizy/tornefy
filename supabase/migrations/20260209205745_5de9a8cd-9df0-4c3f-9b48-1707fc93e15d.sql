-- Add access mode + multi-plan mapping for trainings

ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS subscription_access_mode text NOT NULL DEFAULT 'public';

CREATE TABLE IF NOT EXISTS public.training_allowed_plans (
  training_id text NOT NULL,
  plan_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (training_id, plan_id),
  CONSTRAINT training_allowed_plans_training_id_fkey
    FOREIGN KEY (training_id) REFERENCES public.trainings(id) ON DELETE CASCADE,
  CONSTRAINT training_allowed_plans_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES public.organizer_subscription_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_allowed_plans_training_id
  ON public.training_allowed_plans(training_id);
CREATE INDEX IF NOT EXISTS idx_training_allowed_plans_plan_id
  ON public.training_allowed_plans(plan_id);

ALTER TABLE public.training_allowed_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_allowed_plans' AND policyname='Training allowed plans are readable by everyone'
  ) THEN
    CREATE POLICY "Training allowed plans are readable by everyone"
    ON public.training_allowed_plans
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='training_allowed_plans' AND policyname='Organizers can manage allowed plans for own trainings'
  ) THEN
    CREATE POLICY "Organizers can manage allowed plans for own trainings"
    ON public.training_allowed_plans
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.trainings t
        WHERE t.id = training_allowed_plans.training_id
          AND t.organizer_id = auth.uid()::text
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.trainings t
        WHERE t.id = training_allowed_plans.training_id
          AND t.organizer_id = auth.uid()::text
      )
    );
  END IF;
END $$;

-- Backfill from legacy required_plan_id (text) -> uuid
INSERT INTO public.training_allowed_plans(training_id, plan_id)
SELECT t.id, t.required_plan_id::uuid
FROM public.trainings t
WHERE t.required_plan_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.trainings
SET subscription_access_mode = 'members_only'
WHERE required_plan_id IS NOT NULL;

-- RPC for fast eligibility + allowed plan listing
CREATE OR REPLACE FUNCTION public.get_my_training_access(_training_id text)
RETURNS TABLE(
  mode text,
  eligible boolean,
  matched_plan_id uuid,
  allowed_plans jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
BEGIN
  SELECT t.subscription_access_mode
  INTO v_mode
  FROM public.trainings t
  WHERE t.id = _training_id;

  mode := COALESCE(v_mode, 'public');

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'monthly_fee_coins', p.monthly_fee_coins,
        'period_days', p.period_days,
        'benefits_text', p.benefits_text,
        'max_subscribers', p.max_subscribers,
        'active', p.active
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO allowed_plans
  FROM public.training_allowed_plans tap
  JOIN public.organizer_subscription_plans p ON p.id = tap.plan_id
  WHERE tap.training_id = _training_id
    AND p.active = true;

  IF mode <> 'members_only' THEN
    eligible := true;
    matched_plan_id := null;
    RETURN NEXT;
    RETURN;
  END IF;

  IF auth.uid() IS NULL THEN
    eligible := false;
    matched_plan_id := null;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT m.plan_id
  INTO matched_plan_id
  FROM public.organizer_plan_memberships m
  JOIN public.training_allowed_plans tap ON tap.plan_id = m.plan_id
  WHERE tap.training_id = _training_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.current_period_end > now()
  ORDER BY m.current_period_end DESC
  LIMIT 1;

  eligible := matched_plan_id IS NOT NULL;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_training_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_training_access(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_training_access(text) TO authenticated;
