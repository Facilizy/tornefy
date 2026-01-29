export type RankRow = {
  rank: number;
  team_name: string;
  team_tag: string | null;
  team_logo: string | null;
  points: number;
  kills: number;
  _matches?: number | string | null;
  _wins?: number | string | null;
  _isPlaceholder?: boolean;
  [key: string]: any;
};
