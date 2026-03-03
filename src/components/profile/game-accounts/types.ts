export type Game = {
  id: string;
  name: string;
  logo?: string;
};

export type GameAccountRow = {
  id?: string;
  game_id: string;
  in_game_nick: string;
  in_game_id: string;
};

export type WarningSeverity = "info" | "warn" | "error";
