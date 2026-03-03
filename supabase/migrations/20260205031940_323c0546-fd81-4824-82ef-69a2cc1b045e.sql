-- 1) Notify organizer when a new Q&A question is created
CREATE OR REPLACE FUNCTION public.trg_training_questions_notify_organizer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_training RECORD;
  v_author RECORD;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Fetch training
  SELECT id, name, organizer_id
    INTO v_training
  FROM public.trainings
  WHERE id = NEW.training_id;

  IF v_training.organizer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If author is the organizer, do nothing (avoids self-notify)
  IF auth.uid() IS NOT NULL AND v_training.organizer_id = auth.uid()::text THEN
    RETURN NEW;
  END IF;

  -- Fetch author profile for nicer copy (best-effort)
  SELECT id, COALESCE(full_name, username, 'Usuário') AS display_name
    INTO v_author
  FROM public.profiles
  WHERE id = NEW.author_id;

  v_title := 'Nova pergunta no treino';
  v_message := COALESCE(v_author.display_name, 'Usuário') || ' perguntou em ' || COALESCE(v_training.name, 'seu treino') || '.';

  INSERT INTO public.notifications (id, user_id, title, message, type, related_id, read, created_at)
  VALUES (
    gen_random_uuid()::text,
    v_training.organizer_id,
    v_title,
    v_message,
    'training_question',
    NEW.training_id,
    false,
    now()::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_questions_notify_organizer ON public.training_questions;
CREATE TRIGGER trg_training_questions_notify_organizer
AFTER INSERT ON public.training_questions
FOR EACH ROW
EXECUTE FUNCTION public.trg_training_questions_notify_organizer();


-- 2) Admin-managed FAQ content
-- Tables
CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  language text NOT NULL DEFAULT 'pt-BR',
  audience text NOT NULL DEFAULT 'player',
  topic text NOT NULL DEFAULT 'getting-started',
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS faq_items_slug_lang_uq ON public.faq_items (language, slug);
CREATE INDEX IF NOT EXISTS faq_items_active_idx ON public.faq_items (language, active, topic, audience);

CREATE TABLE IF NOT EXISTS public.faq_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  language text NOT NULL DEFAULT 'pt-BR',
  audience text NOT NULL DEFAULT 'player',
  topic text NOT NULL DEFAULT 'getting-started',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS faq_videos_slug_lang_uq ON public.faq_videos (language, slug);
CREATE INDEX IF NOT EXISTS faq_videos_active_idx ON public.faq_videos (language, active, topic, audience);

-- Updated_at triggers
DROP TRIGGER IF EXISTS set_faq_items_updated_at ON public.faq_items;
CREATE TRIGGER set_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_faq_videos_updated_at ON public.faq_videos;
CREATE TRIGGER set_faq_videos_updated_at
BEFORE UPDATE ON public.faq_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_videos ENABLE ROW LEVEL SECURITY;

-- Public read (FAQ is public-facing)
DROP POLICY IF EXISTS "FAQ items are viewable by everyone" ON public.faq_items;
CREATE POLICY "FAQ items are viewable by everyone"
ON public.faq_items
FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "FAQ videos are viewable by everyone" ON public.faq_videos;
CREATE POLICY "FAQ videos are viewable by everyone"
ON public.faq_videos
FOR SELECT
USING (active = true);

-- Admin write
DROP POLICY IF EXISTS "Admins can insert faq items" ON public.faq_items;
CREATE POLICY "Admins can insert faq items"
ON public.faq_items
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update faq items" ON public.faq_items;
CREATE POLICY "Admins can update faq items"
ON public.faq_items
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete faq items" ON public.faq_items;
CREATE POLICY "Admins can delete faq items"
ON public.faq_items
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert faq videos" ON public.faq_videos;
CREATE POLICY "Admins can insert faq videos"
ON public.faq_videos
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update faq videos" ON public.faq_videos;
CREATE POLICY "Admins can update faq videos"
ON public.faq_videos
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete faq videos" ON public.faq_videos;
CREATE POLICY "Admins can delete faq videos"
ON public.faq_videos
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
