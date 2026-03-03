export interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
}

export interface Round {
  id: string;
  name: string;
  round_number: number;
  /** NULL/[] => todos os times; array => apenas times dos grupos escolhidos */
  allowed_group_ids?: string[] | null;
}

export interface Match {
  id: string;
  name: string;
  match_number: number;
  map_name?: string | null;
  status: string;
}

export interface MatchScore {
  team_id: string;
  position: number;
  /** kills totais da equipe (players + kills extras) */
  kills: number;
  /** kills adicionais lançadas no nível da equipe (não por player) */
  extra_kills?: number;
  bonus_points: number;
}

export interface PositionPoint {
  position: number;
  points: number;
}

export interface PlayerStat {
  /**
   * Identificador estável no cliente para edição na UI.
   * Para membros do time: igual ao team_member_id.
   * Para players avulsos (sem conta): uuid gerado no cliente ou o id do stat no DB.
   */
  client_id: string;
  team_id: string;
  line_id: string | null;
  team_member_id: string | null;
  /** user_id só existe quando o team_member está vinculado a uma conta */
  user_id?: string | null;
  player_name: string;
  kills: number;
  is_mvp: boolean;
}
