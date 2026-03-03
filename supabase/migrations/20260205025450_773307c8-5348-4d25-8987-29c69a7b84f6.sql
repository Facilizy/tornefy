-- Q&A público por treino (perguntas e respostas)

-- 1) Tabelas
CREATE TABLE IF NOT EXISTS public.training_questions (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  training_id TEXT NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT NULL,
  deleted_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_questions_training_id ON public.training_questions(training_id);
CREATE INDEX IF NOT EXISTS idx_training_questions_created_at ON public.training_questions(created_at);

CREATE TABLE IF NOT EXISTS public.training_answers (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  question_id TEXT NOT NULL REFERENCES public.training_questions(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now()::text),
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  deleted_at TEXT NULL,
  deleted_by TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_answers_question_id ON public.training_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_training_answers_created_at ON public.training_answers(created_at);

-- 2) Updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_training_questions_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_training_questions_set_updated_at
    BEFORE UPDATE ON public.training_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_training_answers_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_training_answers_set_updated_at
    BEFORE UPDATE ON public.training_answers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 3) Funções auxiliares de moderação
CREATE OR REPLACE FUNCTION public.can_moderate_training_qa(_training_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.trainings t
      WHERE t.id = _training_id
        AND t.organizer_id = auth.uid()::text
    )
    OR public.has_role(auth.uid(), 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_training_organizer(_training_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainings t
    WHERE t.id = _training_id
      AND t.organizer_id = auth.uid()::text
  );
$$;

-- 4) RLS
ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_answers ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer autenticado pode ver (somente não deletados)
DROP POLICY IF EXISTS "Training Q&A questions are readable" ON public.training_questions;
CREATE POLICY "Training Q&A questions are readable"
ON public.training_questions
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Training Q&A answers are readable" ON public.training_answers;
CREATE POLICY "Training Q&A answers are readable"
ON public.training_answers
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- INSERT: qualquer autenticado pode perguntar
DROP POLICY IF EXISTS "Users can create questions" ON public.training_questions;
CREATE POLICY "Users can create questions"
ON public.training_questions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = author_id
  AND deleted_at IS NULL
);

-- INSERT: somente organizador do treino (ou admin) responde
DROP POLICY IF EXISTS "Organizer can answer" ON public.training_answers;
CREATE POLICY "Organizer can answer"
ON public.training_answers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid()::text = author_id
  AND deleted_at IS NULL
  AND (
    public.can_moderate_training_qa(
      (SELECT q.training_id FROM public.training_questions q WHERE q.id = question_id)
    )
  )
);

-- UPDATE: autor pode editar sua pergunta/resposta; organizador/admin pode moderar (soft-delete/edit)
DROP POLICY IF EXISTS "Users can update own questions; moderators can update" ON public.training_questions;
CREATE POLICY "Users can update own questions; moderators can update"
ON public.training_questions
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = author_id
  OR public.can_moderate_training_qa(training_id)
)
WITH CHECK (
  auth.uid()::text = author_id
  OR public.can_moderate_training_qa(training_id)
);

DROP POLICY IF EXISTS "Users can update own answers; moderators can update" ON public.training_answers;
CREATE POLICY "Users can update own answers; moderators can update"
ON public.training_answers
FOR UPDATE
TO authenticated
USING (
  auth.uid()::text = author_id
  OR public.can_moderate_training_qa(
    (SELECT q.training_id FROM public.training_questions q WHERE q.id = question_id)
  )
)
WITH CHECK (
  auth.uid()::text = author_id
  OR public.can_moderate_training_qa(
    (SELECT q.training_id FROM public.training_questions q WHERE q.id = question_id)
  )
);

-- DELETE: bloquear delete físico (preferir soft delete via UPDATE)
DROP POLICY IF EXISTS "No physical deletes on questions" ON public.training_questions;
CREATE POLICY "No physical deletes on questions"
ON public.training_questions
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "No physical deletes on answers" ON public.training_answers;
CREATE POLICY "No physical deletes on answers"
ON public.training_answers
FOR DELETE
TO authenticated
USING (false);
