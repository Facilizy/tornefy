-- Persistência de progresso de tutoriais (por usuário)
CREATE TABLE IF NOT EXISTS public.tutorial_video_progress (
  user_id text NOT NULL,
  video_id text NOT NULL,
  current_time_seconds int NOT NULL DEFAULT 0,
  duration_seconds int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

ALTER TABLE public.tutorial_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tutorial progress"
ON public.tutorial_video_progress
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tutorial progress"
ON public.tutorial_video_progress
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tutorial progress"
ON public.tutorial_video_progress
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tutorial progress"
ON public.tutorial_video_progress
FOR DELETE
USING (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_video_progress_user
ON public.tutorial_video_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_video_progress_video
ON public.tutorial_video_progress (video_id);