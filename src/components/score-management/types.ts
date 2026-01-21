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
  kills: number;
  bonus_points: number;
}

export interface PositionPoint {
  position: number;
  points: number;
}

export interface PlayerStat {
  team_id: string;
  line_id: string | null;
  team_member_id: string | null;
  player_name: string;
  kills: number;
  is_mvp: boolean;
}
