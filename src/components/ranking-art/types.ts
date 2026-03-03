export type RankingArtFormat = "feed" | "stories" | "overlay";

export type TeamRankRow = {
  team_id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  points: number;
  kills: number;
  matches: number;
  wins: number;
};
