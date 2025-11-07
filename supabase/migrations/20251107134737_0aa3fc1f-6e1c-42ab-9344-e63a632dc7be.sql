-- Criar tabela de bans temporários
CREATE TABLE public.team_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_tag TEXT NOT NULL,
  banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_bans ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver bans (para validar registros)
CREATE POLICY "Bans are viewable by everyone"
ON public.team_bans
FOR SELECT
USING (true);

-- Policy: Sistema pode inserir bans
CREATE POLICY "System can insert bans"
ON public.team_bans
FOR INSERT
WITH CHECK (true);

-- Adicionar coluna expires_at na blacklist
ALTER TABLE public.organizer_blacklist
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');

-- Função para verificar se equipe tem 3+ blacklists de organizadores diferentes
CREATE OR REPLACE FUNCTION public.count_active_blacklists_from_different_organizers(_team_tag text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT organizer_id)::integer
  FROM public.organizer_blacklist
  WHERE team_tag = _team_tag
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Atualizar função de auto-blacklist para incluir ban de 30 dias após 3 denúncias
CREATE OR REPLACE FUNCTION public.auto_blacklist_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count integer;
BEGIN
  -- Contar denúncias do mesmo organizador para esta equipe
  SELECT COUNT(*) INTO report_count
  FROM public.team_reports
  WHERE organizer_id = NEW.organizer_id 
    AND team_tag = NEW.team_tag;
  
  -- Se chegou a 3 denúncias do mesmo organizador, adiciona na blacklist
  IF report_count >= 3 THEN
    INSERT INTO public.organizer_blacklist (organizer_id, team_tag, reason, expires_at)
    VALUES (
      NEW.organizer_id, 
      NEW.team_tag, 
      'Auto-blacklist: 3+ reports',
      now() + interval '30 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Adicionar ban temporário de 30 dias
    INSERT INTO public.team_bans (team_tag, banned_until, reason)
    VALUES (
      NEW.team_tag,
      now() + interval '30 days',
      'Banned: 3 reports from organizer'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar índices para melhor performance
CREATE INDEX idx_team_bans_team_tag ON public.team_bans(team_tag);
CREATE INDEX idx_team_bans_banned_until ON public.team_bans(banned_until);
CREATE INDEX idx_organizer_blacklist_expires_at ON public.organizer_blacklist(expires_at);