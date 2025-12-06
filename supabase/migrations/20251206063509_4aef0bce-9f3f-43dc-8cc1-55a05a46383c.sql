-- Create training_templates table
CREATE TABLE public.training_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  game public.game_type NOT NULL DEFAULT 'free_fire',
  mode public.mode_type NOT NULL,
  platform public.platform_type NOT NULL,
  max_slots INTEGER NOT NULL DEFAULT 20,
  rounds INTEGER NOT NULL DEFAULT 1,
  points_per_kill INTEGER NOT NULL DEFAULT 1,
  points_per_position JSONB NOT NULL DEFAULT '[]'::jsonb,
  points_per_position_text TEXT,
  rules TEXT,
  prize TEXT,
  important_info TEXT,
  discord_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizers can view their own templates"
  ON public.training_templates
  FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can create templates"
  ON public.training_templates
  FOR INSERT
  WITH CHECK (auth.uid() = organizer_id AND has_role(auth.uid(), 'organizer'::user_role));

CREATE POLICY "Organizers can update their own templates"
  ON public.training_templates
  FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their own templates"
  ON public.training_templates
  FOR DELETE
  USING (auth.uid() = organizer_id);

-- Add RLS policy for training_registrations UPDATE (for slot reordering)
CREATE POLICY "Organizers can update slot numbers"
  ON public.training_registrations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trainings t
    WHERE t.id = training_registrations.training_id
    AND t.organizer_id = auth.uid()
  ));