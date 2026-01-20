-- Enable RLS on all remaining tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Permissive policies for public-facing features

-- Notifications: users can read their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Organizer blacklist: organizers can manage their own
CREATE POLICY "Organizers can manage their blacklist"
  ON public.organizer_blacklist FOR ALL
  TO authenticated
  USING (auth.uid()::text = organizer_id)
  WITH CHECK (auth.uid()::text = organizer_id);

-- Profiles: public read, users can update their own
CREATE POLICY "Profiles are publicly visible"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- Team badges: public read
CREATE POLICY "Team badges are publicly visible"
  ON public.team_badges FOR SELECT
  USING (true);

-- Team bans: public read (so teams can see if they're banned)
CREATE POLICY "Team bans are publicly visible"
  ON public.team_bans FOR SELECT
  USING (true);

-- Team invites: users can view invites for them
CREATE POLICY "Users can view their invites"
  ON public.team_invites FOR SELECT
  USING (auth.uid()::text = invited_user_id OR auth.uid()::text IN (SELECT owner_id FROM public.teams WHERE id = team_id));

CREATE POLICY "Team owners can manage invites"
  ON public.team_invites FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT owner_id FROM public.teams WHERE id = team_id))
  WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.teams WHERE id = team_id));

-- Team members: public read
CREATE POLICY "Team members are publicly visible"
  ON public.team_members FOR SELECT
  USING (true);

CREATE POLICY "Team owners can manage members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT owner_id FROM public.teams WHERE id = team_id))
  WITH CHECK (auth.uid()::text IN (SELECT owner_id FROM public.teams WHERE id = team_id));

-- Team reports: organizers can view and manage
CREATE POLICY "Organizers can view team reports"
  ON public.team_reports FOR SELECT
  TO authenticated
  USING (auth.uid()::text = organizer_id);

CREATE POLICY "Organizers can insert team reports"
  ON public.team_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = organizer_id);

-- Teams: public read, owners can manage
CREATE POLICY "Teams are publicly visible"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Team owners can update their team"
  ON public.teams FOR UPDATE
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

-- Training event logs: public read
CREATE POLICY "Event logs are publicly visible"
  ON public.training_event_logs FOR SELECT
  USING (true);

-- Training match scores: public read, organizers can manage
CREATE POLICY "Match scores are publicly visible"
  ON public.training_match_scores FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage scores"
  ON public.training_match_scores FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = (SELECT training_id FROM public.training_matches WHERE id = match_id)))
  WITH CHECK (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = (SELECT training_id FROM public.training_matches WHERE id = match_id)));

-- Training matches: public read, organizers can manage
CREATE POLICY "Matches are publicly visible"
  ON public.training_matches FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage matches"
  ON public.training_matches FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id))
  WITH CHECK (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id));

-- Training messages: public read, organizers can manage
CREATE POLICY "Training messages are publicly visible"
  ON public.training_messages FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage messages"
  ON public.training_messages FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id))
  WITH CHECK (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id));

-- Training rounds: public read, organizers can manage
CREATE POLICY "Training rounds are publicly visible"
  ON public.training_rounds FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage rounds"
  ON public.training_rounds FOR ALL
  TO authenticated
  USING (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id))
  WITH CHECK (auth.uid()::text IN (SELECT organizer_id FROM public.trainings WHERE id = training_id));

-- Training templates: organizers can manage their own
CREATE POLICY "Organizers can view their templates"
  ON public.training_templates FOR SELECT
  TO authenticated
  USING (auth.uid()::text = organizer_id);

CREATE POLICY "Organizers can manage their templates"
  ON public.training_templates FOR ALL
  TO authenticated
  USING (auth.uid()::text = organizer_id)
  WITH CHECK (auth.uid()::text = organizer_id);

-- Trainings: public read, organizers can manage
CREATE POLICY "Trainings are publicly visible"
  ON public.trainings FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their trainings"
  ON public.trainings FOR ALL
  TO authenticated
  USING (auth.uid()::text = organizer_id)
  WITH CHECK (auth.uid()::text = organizer_id);

-- User roles: users can view their own, admins manage all
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid()::text = user_id);