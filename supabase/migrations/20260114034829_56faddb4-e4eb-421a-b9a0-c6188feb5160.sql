-- Enable RLS on team_lines and add policies
ALTER TABLE public.team_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team lines are publicly visible"
ON public.team_lines
FOR SELECT
USING (true);

CREATE POLICY "Team owners can manage lines"
ON public.team_lines
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_lines.team_id AND t.owner_id = auth.uid()::text
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_lines.team_id AND t.owner_id = auth.uid()::text
));