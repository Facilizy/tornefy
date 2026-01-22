export type GameId = "free_fire" | "prime_rush" | "blood_strike" | "farlight_84" | "battlefield_6";

export const GAME_LABELS: Record<GameId, string> = {
  free_fire: "Free Fire",
  prime_rush: "Prime Rush",
  blood_strike: "Blood Strike",
  farlight_84: "Farlight 84",
  battlefield_6: "Battlefield 6",
};

export type RankTierId = "bronze" | "ouro" | "platina" | "diamante" | "triunfante";

export type RankTier = {
  id: RankTierId;
  label: string;
  minPoints: number;
};

// Thresholds iniciais (podemos calibrar depois sem mexer no banco)
export const RANK_TIERS: RankTier[] = [
  { id: "bronze", label: "Bronze", minPoints: 0 },
  { id: "ouro", label: "Ouro", minPoints: 1500 },
  { id: "platina", label: "Platina", minPoints: 3500 },
  { id: "diamante", label: "Diamante", minPoints: 6000 },
  // Triunfante é especial (ver getRankTier)
  { id: "triunfante", label: "Triunfante", minPoints: 8000 },
];

export function getTriunfanteCutoff(totalPlayers: number) {
  // regra: Top 3% OU Top 100
  const top3pct = Math.ceil(totalPlayers * 0.03);
  return Math.min(100, Math.max(1, top3pct));
}

export function getRankTier(params: {
  points: number;
  position?: number; // 1-based
  totalPlayers?: number;
}): RankTier {
  const { points, position, totalPlayers } = params;

  // Triunfante: 8000+ E (Top 3% OU Top 100)
  if (
    typeof position === "number" &&
    typeof totalPlayers === "number" &&
    points >= 8000 &&
    position <= getTriunfanteCutoff(totalPlayers)
  ) {
    return RANK_TIERS[RANK_TIERS.length - 1];
  }

  const nonTriunfante = RANK_TIERS.filter((t) => t.id !== "triunfante");
  let best = nonTriunfante[0];
  for (const tier of nonTriunfante) {
    if (points >= tier.minPoints) best = tier;
  }
  return best;
}

export function getNextTierProgress(points: number) {
  const nonTriunfante = RANK_TIERS.filter((t) => t.id !== "triunfante");
  const current = getRankTier({ points });
  const currentIdx = Math.max(0, nonTriunfante.findIndex((t) => t.id === current.id));
  const next = nonTriunfante[Math.min(nonTriunfante.length - 1, currentIdx + 1)];
  const isMax = next.id === current.id;
  const start = current.minPoints;
  const end = isMax ? current.minPoints : next.minPoints;
  const span = Math.max(1, end - start);
  const pct = isMax ? 100 : Math.min(100, Math.max(0, ((points - start) / span) * 100));
  return { current, next, pct, start, end, isMax };
}
