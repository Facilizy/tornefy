-- Vincula TAGs não reconhecidas a um time APENAS no escopo da rodada (round)
-- sem alterar teams.tag

CREATE TABLE IF NOT EXISTS public.training_round_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL,
  tag text NOT NULL,
  team_id text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, tag)
);

-- Índice auxiliar por time
CREATE INDEX IF NOT EXISTS idx_training_round_tag_links_team_id
  ON public.training_round_tag_links(team_id);

ALTER TABLE public.training_round_tag_links ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso direto pelo client (somente via Edge Function com service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_round_tag_links'
      AND policyname = 'training_round_tag_links_deny_select'
  ) THEN
    CREATE POLICY training_round_tag_links_deny_select
    ON public.training_round_tag_links
    FOR SELECT
    USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_round_tag_links'
      AND policyname = 'training_round_tag_links_deny_insert'
  ) THEN
    CREATE POLICY training_round_tag_links_deny_insert
    ON public.training_round_tag_links
    FOR INSERT
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_round_tag_links'
      AND policyname = 'training_round_tag_links_deny_update'
  ) THEN
    CREATE POLICY training_round_tag_links_deny_update
    ON public.training_round_tag_links
    FOR UPDATE
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'training_round_tag_links'
      AND policyname = 'training_round_tag_links_deny_delete'
  ) THEN
    CREATE POLICY training_round_tag_links_deny_delete
    ON public.training_round_tag_links
    FOR DELETE
    USING (false);
  END IF;
END$$;

-- updated_at trigger (reusa função existente)
DROP TRIGGER IF EXISTS trg_training_round_tag_links_updated_at ON public.training_round_tag_links;
CREATE TRIGGER trg_training_round_tag_links_updated_at
BEFORE UPDATE ON public.training_round_tag_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
