-- Atualizar enum de funções dos jogadores para apenas RUSH, SUPORTE, CAPITÃO
-- Primeiro, vamos atualizar os dados existentes e depois alterar o enum

-- Adicionar novos campos na tabela trainings primeiro
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
  ADD COLUMN IF NOT EXISTS points_per_position_text text,
  ADD COLUMN IF NOT EXISTS table_image_url text,
  ADD COLUMN IF NOT EXISTS important_info text;

-- Atualizar a coluna function para text temporariamente
ALTER TABLE public.team_members 
  ALTER COLUMN function TYPE text;

-- Atualizar todos os valores existentes para os novos padrões
UPDATE public.team_members
SET function = CASE 
  WHEN UPPER(function) LIKE '%SUPORTE%' OR UPPER(function) LIKE '%SUPPORT%' THEN 'SUPORTE'
  WHEN UPPER(function) LIKE '%RUSH%' OR UPPER(function) LIKE '%FRAGGER%' THEN 'RUSH'
  WHEN UPPER(function) LIKE '%CAPIT%' OR UPPER(function) LIKE '%IGL%' OR UPPER(function) LIKE '%LEADER%' THEN 'CAPITÃO'
  ELSE 'RUSH' -- valor padrão
END;

-- Remover o enum antigo
DROP TYPE IF EXISTS player_function;

-- Criar novo enum com apenas as 3 funções
CREATE TYPE player_function AS ENUM ('RUSH', 'SUPORTE', 'CAPITÃO');

-- Alterar a coluna para usar o novo enum
ALTER TABLE public.team_members 
  ALTER COLUMN function TYPE player_function 
  USING function::player_function;