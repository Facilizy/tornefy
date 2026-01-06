-- Allow everyone to view team members for public team profiles
CREATE POLICY "Team members are viewable by everyone"
ON public.team_members
FOR SELECT
USING (true);