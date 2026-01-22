-- Create table for in-app bug reports
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  user_agent TEXT NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Users can create their own bug reports'
  ) THEN
    CREATE POLICY "Users can create their own bug reports"
    ON public.bug_reports
    FOR INSERT
    WITH CHECK ((auth.uid())::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Users can view their own bug reports'
  ) THEN
    CREATE POLICY "Users can view their own bug reports"
    ON public.bug_reports
    FOR SELECT
    USING ((auth.uid())::text = user_id);
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_created_at
ON public.bug_reports (user_id, created_at DESC);
