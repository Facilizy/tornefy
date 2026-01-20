-- Achievements structure: generic achievements + per-user progress

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  -- 'player' ou 'organizer'
  audience text NOT NULL,
  -- métrica base: 'kills', 'mvps', 'scrims_played', 'scrims_hosted', etc.
  metric text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Conquistas são públicas (apenas leitura)
CREATE POLICY "Achievements are publicly visible"
ON public.achievements
FOR SELECT
USING (true);

-- Tabela de progresso de conquistas por usuário
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seu próprio progresso
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid()::text = user_id);

-- Usuário pode criar/atualizar seu próprio progresso (poderemos migrar isso para edge function depois)
CREATE POLICY "Users can manage own achievements"
ON public.user_achievements
FOR ALL
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
