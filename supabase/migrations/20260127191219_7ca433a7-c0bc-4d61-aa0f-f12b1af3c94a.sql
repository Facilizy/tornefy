-- Seed base achievements (missions) for players
-- Ensures Missions tab has definitions to render.

-- Unique code for idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS achievements_code_key ON public.achievements (code);

INSERT INTO public.achievements (code, metric, target_value, name, description, audience)
VALUES
  ('scrims_played_5',   'scrims_played',  5,  'Estreante',  'Jogue 5 scrims',  'player'),
  ('scrims_played_25',  'scrims_played', 25,  'Veterano',   'Jogue 25 scrims', 'player'),
  ('kills_total_50',    'kills_total',   50,  'Matador I',  'Faça 50 abates em scrims',  'player'),
  ('kills_total_250',   'kills_total',  250,  'Matador II', 'Faça 250 abates em scrims', 'player'),
  ('mvps_total_1',      'mvps_total',     1,  'MVP',        'Seja MVP 1 vez',  'player'),
  ('mvps_total_10',     'mvps_total',    10,  'MVP Lendário','Seja MVP 10 vezes','player')
ON CONFLICT (code) DO NOTHING;
