import { useSearchParams } from "react-router-dom";
import { TabelaGeralTable } from "./overlayTabelaGeral/TabelaGeralTable";
import { useOverlayRankingRows } from "./overlayTabelaGeral/useOverlayRankingRows";
import { clamp } from "@/components/broadcast-links/url";
import type { ColumnKey } from "./overlayTabelaGeral/columns";

function isHexColor(s: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || ""));
}

export default function OverlayTabelaGeral() {
  const [qs] = useSearchParams();
  const fontColorRaw = qs.get("font_color") || "";
  // No OBS normalmente o fundo é escuro: branco por padrão
  const fontColor = isHexColor(fontColorRaw) ? fontColorRaw : "#ffffff";

  const firstColorRaw = qs.get("first_color") || "";
  const firstColor = isHexColor(firstColorRaw) ? firstColorRaw : "";

  const headerBgRaw = qs.get("header_bg") || "";
  const headerBg = isHexColor(headerBgRaw) ? headerBgRaw : null;

  const headerTextRaw = qs.get("header_text") || "";
  const headerTextColor = isHexColor(headerTextRaw) ? headerTextRaw : null;

  const rowBgRaw = qs.get("row_bg") || "";
  const rowBg = isHexColor(rowBgRaw) ? rowBgRaw : null;

  const rowAltBgRaw = qs.get("row_alt_bg") || "";
  const rowAltBg = isHexColor(rowAltBgRaw) ? rowAltBgRaw : null;

  const rowBorderColorRaw = qs.get("row_border_color") || "";
  const rowBorderColor = isHexColor(rowBorderColorRaw) ? rowBorderColorRaw : null;

  const parseNumber = (key: string, min: number, max: number, fallback: number): number => {
    const raw = qs.get(key);
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, min, max);
  };

  const cornerRadius = parseNumber("corner_radius", 0, 48, 12);
  const rowBorderWidth = parseNumber("row_border_width", 0, 8, 1);
  const cellPaddingX = parseNumber("cell_px", 0, 64, 16);
  const cellPaddingY = parseNumber("cell_py", 0, 32, 8);

  const densityRaw = (qs.get("density") || "").toLowerCase();
  const density: "compact" | "comfortable" = densityRaw === "compact" || densityRaw === "comfortable" ? densityRaw : "comfortable";

  const parseBool = (key: string, fallback: boolean): boolean => {
    const raw = qs.get(key);
    if (raw === null) return fallback;
    return raw === "1" || raw.toLowerCase() === "true";
  };

  const { limit, cols, gap, font, showLogo, showHeader, shouldMatches, shouldWins, leftRows, rightRows, status } =
    useOverlayRankingRows();

  const showTag = parseBool("show_tag", false);
  const showName = parseBool("show_name", true);
  const showPoints = parseBool("show_points", true);
  const showKills = parseBool("show_kills", true);

  const colOrderRaw = (qs.get("col_order") || "").trim();
  const colOrder = colOrderRaw
    ? (colOrderRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(
          (k): k is ColumnKey =>
            k === "rank" ||
            k === "logo" ||
            k === "tag" ||
            k === "team" ||
            k === "wins" ||
            k === "matches" ||
            k === "kills" ||
            k === "points"
        ))
    : null;

  // Altura adaptativa para caber até 24 linhas.
  // Aproximação: 32px por linha + cabeçalho (32px) + respiro.
  const overlayHeight = Math.max(300, (showHeader ? 32 : 0) + limit * 32 + 12);

  // Overlay canvas (1920x300) + fundo transparente
  return (
    <div
      style={{ width: 1920, height: overlayHeight, background: "transparent", color: fontColor }}
      className="overflow-hidden px-[78px]"
    >
      <div
        className="w-full h-full grid items-start"
        style={{ gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr", gap }}
      >
        <div className="w-full">
          <TabelaGeralTable
            data={leftRows}
            aria="Tabela geral (coluna 1)"
            font={font}
            showLogo={showLogo}
            showHeader={showHeader}
            showMatches={shouldMatches}
            showWins={shouldWins}
              colOrder={colOrder}
            firstColor={firstColor}
            fontColor={fontColor}
            headerBg={headerBg}
            headerTextColor={headerTextColor}
            rowBg={rowBg}
            rowAltBg={rowAltBg}
            rowBorderColor={rowBorderColor}
            rowBorderWidth={rowBorderWidth}
            cornerRadius={cornerRadius}
            cellPaddingX={cellPaddingX}
            cellPaddingY={cellPaddingY}
            density={density}
            showTag={showTag}
            showName={showName}
            showPoints={showPoints}
            showKills={showKills}
          />
        </div>
        {cols === 2 ? (
          <div className="w-full">
            <TabelaGeralTable
              data={rightRows}
              aria="Tabela geral (coluna 2)"
              font={font}
              showLogo={showLogo}
              showHeader={showHeader}
              showMatches={shouldMatches}
              showWins={shouldWins}
              colOrder={colOrder}
              firstColor={firstColor}
              fontColor={fontColor}
              headerBg={headerBg}
              headerTextColor={headerTextColor}
              rowBg={rowBg}
              rowAltBg={rowAltBg}
              rowBorderColor={rowBorderColor}
              rowBorderWidth={rowBorderWidth}
              cornerRadius={cornerRadius}
              cellPaddingX={cellPaddingX}
              cellPaddingY={cellPaddingY}
              density={density}
              showTag={showTag}
              showName={showName}
              showPoints={showPoints}
              showKills={showKills}
            />
          </div>
        ) : null}
      </div>

      {status ? (
        <div className="mt-2 text-[11px] opacity-70" aria-live="polite">
          {status}
        </div>
      ) : null}
    </div>
  );
}

