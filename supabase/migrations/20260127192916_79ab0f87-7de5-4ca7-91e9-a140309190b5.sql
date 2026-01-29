-- Seed additional player missions (achievements)
-- Uses unique code to avoid duplicates.

INSERT INTO public.achievements (audience, code, metric, name, description, target_value)
VALUES
  ('player','scrims_played_1','scrims_played','Primeira Scrim','Jogue sua primeira scrim.',1),
  ('player','scrims_played_10','scrims_played','Veterano de Scrims I','Jogue 10 scrims.',10),
  ('player','scrims_played_50','scrims_played','Veterano de Scrims II','Jogue 50 scrims.',50),
  ('player','scrims_played_100','scrims_played','Lenda das Scrims','Jogue 100 scrims.',100),

  ('player','kills_total_10','kills_total','Primeiros Abates','Faça 10 kills no total.',10),
  ('player','kills_total_100','kills_total','Máquina de Kills I','Faça 100 kills no total.',100),
  ('player','kills_total_500','kills_total','Máquina de Kills II','Faça 500 kills no total.',500),
  ('player','kills_total_1000','kills_total','Ceifador','Faça 1000 kills no total.',1000),

  ('player','mvps_total_3','mvps_total','MVP em Ascensão','Seja MVP 3 vezes.',3),
  ('player','mvps_total_5','mvps_total','MVP Consistente','Seja MVP 5 vezes.',5),
  ('player','mvps_total_25','mvps_total','MVP Imparável','Seja MVP 25 vezes.',25)
ON CONFLICT (code) DO NOTHING;
