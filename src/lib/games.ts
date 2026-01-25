export type GameId =
  | "free_fire"
  | "blood_strike"
  | "farlight_84"
  | "prime_rush"
  | "battlefield_6";

export type GameMeta = {
  id: GameId;
  label: string;
  logo: string;
};

export const GAMES: GameMeta[] = [
  { id: "free_fire", label: "Free Fire", logo: "/game-logos/free-fire.png" },
  { id: "blood_strike", label: "Blood Strike", logo: "/game-logos/blood-strike.png" },
  { id: "farlight_84", label: "Farlight 84", logo: "/game-logos/farlight-84.png" },
  { id: "prime_rush", label: "Prime Rush", logo: "/game-logos/prime-rush.png" },
  { id: "battlefield_6", label: "Battlefield 6", logo: "/game-logos/battlefield-6.webp" },
];

const GAME_BY_ID = new Map(GAMES.map((g) => [g.id, g] as const));

export function getGameLabel(game?: string | null): string {
  if (!game) return "—";
  return GAME_BY_ID.get(game as any)?.label ?? String(game);
}

export function getGameLogo(game?: string | null): string {
  if (!game) return "";
  return GAME_BY_ID.get(game as any)?.logo ?? "";
}
