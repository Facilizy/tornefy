-- Fix duplicate tags by appending a unique suffix
WITH duplicates AS (
  SELECT tag, id, 
    ROW_NUMBER() OVER (PARTITION BY tag ORDER BY created_at) as rn
  FROM public.teams
)
UPDATE public.teams
SET tag = teams.tag || '_' || duplicates.rn
FROM duplicates
WHERE teams.id = duplicates.id AND duplicates.rn > 1;

-- Now add unique constraint to team tags
ALTER TABLE public.teams ADD CONSTRAINT teams_tag_unique UNIQUE (tag);

-- Add fields for private trainings and invites
ALTER TABLE public.trainings 
ADD COLUMN is_private boolean NOT NULL DEFAULT false,
ADD COLUMN invited_tags text[] DEFAULT '{}';

-- Create organizer blacklist table
CREATE TABLE public.organizer_blacklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_tag text NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organizer_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage their blacklist"
ON public.organizer_blacklist FOR ALL
USING (auth.uid() = organizer_id);

CREATE POLICY "Blacklist is viewable by everyone"
ON public.organizer_blacklist FOR SELECT
USING (true);

-- Create training event logs table
CREATE TABLE public.training_event_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  team_tag text NOT NULL,
  action text NOT NULL CHECK (action IN ('joined', 'left')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.training_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their training logs"
ON public.training_event_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.trainings
  WHERE trainings.id = training_event_logs.training_id
  AND trainings.organizer_id = auth.uid()
));

CREATE POLICY "System can insert event logs"
ON public.training_event_logs FOR INSERT
WITH CHECK (true);

-- Create team reports table
CREATE TABLE public.team_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_tag text NOT NULL,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('no_show', 'cheating', 'rule_violation')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their reports"
ON public.team_reports FOR SELECT
USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create reports"
ON public.team_reports FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id AND
  EXISTS (
    SELECT 1 FROM public.trainings
    WHERE trainings.id = team_reports.training_id
    AND trainings.organizer_id = auth.uid()
  )
);

-- Auto-blacklist function
CREATE OR REPLACE FUNCTION public.auto_blacklist_team()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  report_count integer;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.team_reports
  WHERE organizer_id = NEW.organizer_id AND team_tag = NEW.team_tag;
  
  IF report_count >= 3 THEN
    INSERT INTO public.organizer_blacklist (organizer_id, team_tag, reason)
    VALUES (NEW.organizer_id, NEW.team_tag, 'Auto-blacklist: 3+ reports')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_blacklist_after_reports
AFTER INSERT ON public.team_reports
FOR EACH ROW EXECUTE FUNCTION public.auto_blacklist_team();

-- Log registration function
CREATE OR REPLACE FUNCTION public.log_training_registration()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  team_info record;
BEGIN
  SELECT name, tag INTO team_info FROM public.teams WHERE id = NEW.team_id;
  INSERT INTO public.training_event_logs (training_id, team_id, team_name, team_tag, action)
  VALUES (NEW.training_id, NEW.team_id, team_info.name, team_info.tag, 'joined');
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_registration_insert
AFTER INSERT ON public.training_registrations
FOR EACH ROW EXECUTE FUNCTION public.log_training_registration();

-- Log unregistration function
CREATE OR REPLACE FUNCTION public.log_training_unregistration()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  team_info record;
BEGIN
  SELECT name, tag INTO team_info FROM public.teams WHERE id = OLD.team_id;
  INSERT INTO public.training_event_logs (training_id, team_id, team_name, team_tag, action)
  VALUES (OLD.training_id, OLD.team_id, team_info.name, team_info.tag, 'left');
  RETURN OLD;
END;
$$;

CREATE TRIGGER log_registration_delete
AFTER DELETE ON public.training_registrations
FOR EACH ROW EXECUTE FUNCTION public.log_training_unregistration();