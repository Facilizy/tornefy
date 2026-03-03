import type { RankRow } from "./types";
import type { ColumnKey } from "./columns";
import { buildColumns, colLabel } from "./columns";

type Density = "compact" | "comfortable";

type Props = {
  data: RankRow[];
  aria: string;
  font: number;
  showLogo: boolean;
  showHeader: boolean;
  showMatches: boolean;
  showWins: boolean;
  colOrder?: ColumnKey[] | null;
  firstColor?: string;
  fontColor?: string;
  headerBg?: string | null;
  headerTextColor?: string | null;
  rowBg?: string | null;
  rowAltBg?: string | null;
  rowBorderColor?: string | null;
  rowBorderWidth?: number;
  cornerRadius?: number;
  cellPaddingX?: number;
  cellPaddingY?: number;
  density?: Density;
  showTag?: boolean;
  showName?: boolean;
  showPoints?: boolean;
  showKills?: boolean;
};

export function TabelaGeralTable({
  data,
  aria,
  font,
  showLogo,
  showHeader,
  showMatches,
  showWins,
  colOrder,
  firstColor,
  fontColor,
  headerBg,
  headerTextColor,
  rowBg,
  rowAltBg,
  rowBorderColor,
  rowBorderWidth = 1,
  cornerRadius = 12,
  cellPaddingX = 16,
  cellPaddingY = 8,
  density = "comfortable",
  showTag = false,
  showName = true,
  showPoints = true,
  showKills = true,
}: Props) {
  const headerCols = buildColumns({
    showLogo,
    showTag,
    showName,
    showWins,
    showMatches,
    showKills,
    showPoints,
    order: colOrder ?? null,
  });

  const Row = ({ r, index }: { r: RankRow; index: number }) => {
    const isPlaceholder = Boolean(r._isPlaceholder);
    const isFirst = !isPlaceholder && r.rank === 1;
    const firstStyle = isFirst && firstColor ? ({ color: firstColor } as const) : undefined;

     const baseRowPaddingY = density === "compact" ? cellPaddingY * 0.7 : cellPaddingY;
     const rowBackground = index % 2 === 0 ? rowBg ?? "transparent" : rowAltBg ?? rowBg ?? "transparent";

    return (
      <tr
        style={{
          backgroundColor: rowBackground,
          borderBottom:
            rowBorderWidth && rowBorderWidth > 0 && rowBorderColor
              ? `${rowBorderWidth}px solid ${rowBorderColor}`
              : undefined,
        }}
      >
        {headerCols.map(({ key }) => {
          const commonStyle = { padding: `${baseRowPaddingY}px ${cellPaddingX}px` } as const;

          if (key === "rank") {
            return (
              <td key={key} className="whitespace-nowrap text-center" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {String(r.rank).padStart(2, "0")}.
                </span>
              </td>
            );
          }

          if (key === "logo") {
            return (
              <td key={key} className="text-center" style={commonStyle}>
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
            );
          }

          if (key === "tag") {
            return (
              <td key={key} className="whitespace-nowrap text-center" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {isPlaceholder ? "-" : r.team_tag ? `[${r.team_tag}]` : "—"}
                </span>
              </td>
            );
          }

          if (key === "team") {
            return (
              <td key={key} className="min-w-0 text-center" style={commonStyle}>
                <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                    {isPlaceholder ? "-" : r.team_name}
                  </span>
                  {!showTag && !isPlaceholder && r.team_tag ? (
                    <span className="text-xs ml-2 opacity-80" style={{ ...firstStyle }}>
                      [{r.team_tag}]
                    </span>
                  ) : null}
                </div>
              </td>
            );
          }

          if (key === "wins") {
            return (
              <td key={key} className="text-center whitespace-nowrap" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {isPlaceholder ? "-" : r._wins ?? "—"}
                </span>
              </td>
            );
          }

          if (key === "matches") {
            return (
              <td key={key} className="text-center whitespace-nowrap" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {isPlaceholder ? "-" : r._matches ?? "—"}
                </span>
              </td>
            );
          }

          if (key === "kills") {
            return (
              <td key={key} className="text-center whitespace-nowrap" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {isPlaceholder ? "-" : r.kills}
                </span>
              </td>
            );
          }

          if (key === "points") {
            return (
              <td key={key} className="text-center whitespace-nowrap" style={commonStyle}>
                <span className="font-black" style={{ fontSize: font, ...firstStyle }}>
                  {isPlaceholder ? "-" : r.points}
                </span>
              </td>
            );
          }

          return null;
        })}
      </tr>
    );
  };

  return (
    <div
      className="w-full overflow-hidden"
      style={{ borderRadius: cornerRadius, backgroundColor: rowBg ?? "transparent" }}
    >
      <table className="w-full table-fixed border-collapse" aria-label={aria}>
        {showHeader ? (
          <thead>
            <tr
              style={{
                backgroundColor: headerBg ?? "transparent",
                color: headerTextColor ?? fontColor ?? undefined,
                borderBottom:
                  rowBorderWidth && rowBorderWidth > 0 && rowBorderColor
                    ? `${rowBorderWidth}px solid ${rowBorderColor}`
                    : undefined,
              }}
            >
              {headerCols.map((c) => (
                <th
                  key={c.key}
                  className={`${c.className} pb-3 text-xs uppercase tracking-[0.18em] font-extrabold opacity-90 text-center`}
                  style={{ padding: `0 ${cellPaddingX}px` }}
                >
                  {colLabel(c.key)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {data.map((r, idx) => (
            <Row key={`${r.rank}-${idx}`} r={r} index={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
