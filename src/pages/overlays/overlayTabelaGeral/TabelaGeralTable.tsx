import type { RankRow } from "./types";

type Props = {
  data: RankRow[];
  aria: string;
  font: number;
  showLogo: boolean;
  showHeader: boolean;
  showMatches: boolean;
  showWins: boolean;
  firstColor?: string;
};

export function TabelaGeralTable({ data, aria, font, showLogo, showHeader, showMatches, showWins, firstColor }: Props) {
  const colLabel = (key: string) => {
    if (key === "rank") return "RANK";
    if (key === "logo") return "LOGO";
    if (key === "team") return "NOME";
    if (key === "wins") return "VITÓRIAS";
    if (key === "matches") return "PARTIDAS";
    if (key === "kills") return "KILLS";
    if (key === "points") return "PONTOS";
    return key.toUpperCase();
  };

  const headerCols: Array<{ key: string; className: string }> = [{ key: "rank", className: "w-[90px]" }];
  if (showLogo) headerCols.push({ key: "logo", className: "w-[80px]" });
  headerCols.push({ key: "team", className: "w-auto" });
  if (showWins) headerCols.push({ key: "wins", className: "w-[170px]" });
  if (showMatches) headerCols.push({ key: "matches", className: "w-[190px]" });
  headerCols.push({ key: "kills", className: "w-[150px]" });
  headerCols.push({ key: "points", className: "w-[150px]" });

  const Row = ({ r }: { r: RankRow }) => {
    const isPlaceholder = Boolean(r._isPlaceholder);
    const isFirst = !isPlaceholder && r.rank === 1;
    const firstStyle = isFirst && firstColor ? ({ color: firstColor } as const) : undefined;

    return (
      <tr>
        <td className="py-3 px-2 whitespace-nowrap text-center">
          <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
            {String(r.rank).padStart(2, "0")}.
          </span>
        </td>

        {showLogo ? (
          <td className="py-3 px-2 text-center">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-none" style={{ background: "transparent" }}>
                {!isPlaceholder && r.team_logo ? (
                  <img
                    src={r.team_logo}
                    alt={`Logo ${r.team_name}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: "transparent" }} />
                )}
              </div>
            </div>
          </td>
        ) : null}

        <td className="py-3 px-2 min-w-0 text-center">
          <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
              {isPlaceholder ? "-" : r.team_name}
            </span>
            {!isPlaceholder && r.team_tag ? (
              <span className="text-xs ml-2 opacity-80" style={{ ...firstStyle }}>
                [{r.team_tag}]
              </span>
            ) : null}
          </div>
        </td>

        {showWins ? (
          <td className="py-3 px-2 text-center whitespace-nowrap">
            <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
              {isPlaceholder ? "-" : r._wins ?? "—"}
            </span>
          </td>
        ) : null}

        {showMatches ? (
          <td className="py-3 px-2 text-center whitespace-nowrap">
            <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
              {isPlaceholder ? "-" : r._matches ?? "—"}
            </span>
          </td>
        ) : null}

        <td className="py-3 px-2 text-center whitespace-nowrap">
          <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
            {isPlaceholder ? "-" : r.kills}
          </span>
        </td>

        <td className="py-3 px-2 text-center whitespace-nowrap">
          <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
            {isPlaceholder ? "-" : r.points}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <table className="w-full table-fixed border-collapse" aria-label={aria}>
      {showHeader ? (
        <thead>
          <tr>
            {headerCols.map((c) => (
              <th
                key={c.key}
                className={`${c.className} pb-3 text-xs uppercase tracking-[0.18em] font-extrabold opacity-90 text-center border-b border-border/40`}
              >
                {colLabel(c.key)}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {data.map((r, idx) => (
          <Row key={`${r.rank}-${idx}`} r={r} />
        ))}
      </tbody>
    </table>
  );
}
