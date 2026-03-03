export type ColumnKey = "rank" | "logo" | "tag" | "team" | "wins" | "matches" | "kills" | "points";

export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  "rank",
  "logo",
  "tag",
  "team",
  "wins",
  "matches",
  "kills",
  "points",
];

export function colLabel(key: ColumnKey) {
  if (key === "rank") return "RANK";
  if (key === "logo") return "LOGO";
  if (key === "tag") return "TAG";
  if (key === "team") return "NOME";
  if (key === "wins") return "VITÓRIAS";
  if (key === "matches") return "PARTIDAS";
  if (key === "kills") return "KILLS";
  if (key === "points") return "PONTOS";
  return String(key).toUpperCase();
}

export function buildColumns(params: {
  showLogo: boolean;
  showTag: boolean;
  showName: boolean;
  showWins: boolean;
  showMatches: boolean;
  showKills: boolean;
  showPoints: boolean;
  order?: ColumnKey[] | null;
}) {
  const {
    showLogo,
    showTag,
    showName,
    showWins,
    showMatches,
    showKills,
    showPoints,
    order,
  } = params;

  const canShow: Record<ColumnKey, boolean> = {
    rank: true,
    logo: showLogo,
    tag: showTag,
    team: showName,
    wins: showWins,
    matches: showMatches,
    kills: showKills,
    points: showPoints,
  };

  const classByKey: Record<ColumnKey, string> = {
    rank: "w-[90px]",
    logo: "w-[80px]",
    tag: "w-[120px]",
    team: "w-auto",
    wins: "w-[170px]",
    matches: "w-[190px]",
    kills: "w-[150px]",
    points: "w-[150px]",
  };

  const base = (order && order.length ? order : DEFAULT_COLUMN_ORDER).filter((k) => canShow[k]);

  // Sempre garante rank na primeira coluna.
  const out: ColumnKey[] = base.includes("rank") ? base : (["rank", ...base] as ColumnKey[]);
  if (out[0] !== "rank") {
    const withoutRank = out.filter((k) => k !== "rank");
    out.splice(0, out.length, "rank", ...withoutRank);
  }

  return out.map((key) => ({ key, className: classByKey[key] }));
}
