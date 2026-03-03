-- Fix migration: training_rounds(id) não tem constraint UNIQUE/PK, então não dá para FK.
-- Vamos manter round_id sem FK e validar via políticas/queries.

-- Garantir tabela
CREATE TABLE IF NOT EXISTS public.training_round_slots (
  id text NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  round_id text NOT NULL,
  team_id text NOT NULL,
  slot_number integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- FK apenas para teams(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_round_slots_team_id_fkey'
  ) THEN
    ALTER TABLE public.training_round_slots
      ADD CONSTRAINT training_round_slots_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id)
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- Uniques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_round_slots_unique_round_team'
  ) THEN
    ALTER TABLE public.training_round_slots
      ADD CONSTRAINT training_round_slots_unique_round_team UNIQUE (round_id, team_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_round_slots_unique_round_slot'
  ) THEN
    ALTER TABLE public.training_round_slots
      ADD CONSTRAINT training_round_slots_unique_round_slot UNIQUE (round_id, slot_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_round_slots_round_id ON public.training_round_slots(round_id);
CREATE INDEX IF NOT EXISTS idx_training_round_slots_team_id ON public.training_round_slots(team_id);

ALTER TABLE public.training_round_slots ENABLE ROW LEVEL SECURITY;

-- Leitura: usuários logados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_round_slots' AND policyname='training_round_slots_select_authenticated'
  ) THEN
    CREATE POLICY training_round_slots_select_authenticated
    ON public.training_round_slots
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Escrita: organizer do scrim (via join em training_rounds) ou admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_round_slots' AND policyname='training_round_slots_write_organizer_or_admin'
  ) THEN
    CREATE POLICY training_round_slots_write_organizer_or_admin
    ON public.training_round_slots
    FOR ALL
    USING (
      (EXISTS (
        SELECT 1
        FROM public.training_rounds r
        JOIN public.trainings t ON t.id = r.training_id
        WHERE r.id = training_round_slots.round_id
          AND t.organizer_id = (auth.uid())::text
      ))
      OR has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
      (EXISTS (
        SELECT 1
        FROM public.training_rounds r
        JOIN public.trainings t ON t.id = r.training_id
        WHERE r.id = training_round_slots.round_id
          AND t.organizer_id = (auth.uid())::text
      ))
      OR has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;
