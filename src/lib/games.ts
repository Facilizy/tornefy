import pubgMobileLogo from "@/assets/game-logos/pubg-mobile-icon.png";

export type GameId =
  | "free_fire"
  | "blood_strike"
  | "farlight_84"
  | "prime_rush"
  | "pubg_mobile";

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
  // Use bundled asset (hashed URL) to avoid stale PWA cache of /public files.
  { id: "pubg_mobile", label: "PUBG Mobile", logo: pubgMobileLogo },
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
