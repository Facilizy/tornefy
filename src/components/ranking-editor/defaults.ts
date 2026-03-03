import type { EditorDocument, EditorFormat, EditorElement } from "./types";
import { EDITOR_SIZE } from "./types";
import type { TeamRankRow } from "@/components/ranking-art/types";
import { hexToHslTriplet } from "@/lib/color";

function id() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
}

export function createDefaultDocument(params: {
  format: EditorFormat;
  trainingName?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  rows: TeamRankRow[];
}): EditorDocument {
  const size = EDITOR_SIZE[params.format];

  const primaryTriplet = params.primaryColor ? hexToHslTriplet(params.primaryColor) : null;
  const secondaryTriplet = params.secondaryColor ? hexToHslTriplet(params.secondaryColor) : null;
  // Defaults pensados para fundo preto e contraste forte (estilo Adobe/OBS)
  const headerBg = primaryTriplet ? `hsl(${primaryTriplet} / 0.78)` : null;
  const rowBg = primaryTriplet ? `hsl(${primaryTriplet} / 0.18)` : null;
  const rowAltBg = secondaryTriplet ? `hsl(${secondaryTriplet} / 0.14)` : null;
  const rowBorder = primaryTriplet ? `hsl(${primaryTriplet} / 0.55)` : null;

  const elements: EditorElement[] = [
    {
      id: id(),
      type: "text",
      x: 80,
      y: params.format === "overlay" ? 86 : 96,
      w: size.w - 160,
      h: 120,
      rotation: 0,
      opacity: 1,
      text: "TABELA GERAL",
      fontSize: params.format === "overlay" ? 68 : 86,
      fontWeight: 900,
      align: "left",
      uppercase: true,
      letterSpacing: -0.5,
    },
    {
      id: id(),
      type: "ranking_table",
      x: params.format === "overlay" ? size.w - 640 : 80,
      y: params.format === "overlay" ? 220 : 260,
      w: params.format === "overlay" ? 560 : size.w - 160,
      h: params.format === "overlay" ? size.h - 320 : size.h - 360,
      rotation: 0,
      opacity: 1,
      limit: 12,
      showHeader: true,
      // ordem pedida: POSIÇÃO, NOME, PART, KILLS, PTS
      columns: ["pos", "name", "matches", "kills", "points"],
      rowFontSize: params.format === "overlay" ? 22 : 26,
      headerFontSize: params.format === "overlay" ? 18 : 20,
      density: params.format === "overlay" ? "compact" : "comfortable",
      rowTextColor: "#ffffff",
      // você pediu: sem espaçamento entre linhas por padrão
      rowGap: 0,
      // você pediu: começar sem faixa/bordas (você pode ligar depois via propriedades)
      accentBarWidth: 0,
      accentBarColor: params.primaryColor ?? null,
      headerBgColor: headerBg,
      headerTextColor: "hsl(var(--foreground) / 1)",
      rowBgColor: rowBg,
      rowAltBgColor: rowAltBg,
      rowBorderColor: rowBorder,
      // você pediu: começar sem bordas
      rowBorderWidth: 0,
      // mais quadrada (como referência)
      cornerRadius: 0,
      cellPaddingX: params.format === "overlay" ? 10 : 12,
      cellPaddingY: params.format === "overlay" ? 8 : 10,
    },
    {
      id: id(),
      type: "text",
      x: 80,
      y: size.h - (params.format === "overlay" ? 90 : 110),
      w: size.w - 160,
      h: 60,
      rotation: 0,
      opacity: 0.9,
      text: params.trainingName ? String(params.trainingName) : "",
      fontSize: params.format === "overlay" ? 22 : 26,
      fontWeight: 800,
      align: "center",
      uppercase: true,
      letterSpacing: 0.2,
    },
  ];

  return {
    id: id(),
    name: params.trainingName ? `Template ${params.trainingName}` : "Template",
    format: params.format,
    width: size.w,
    height: size.h,
    guides: [],
    background: {
      // você pediu fundo preto por padrão
      kind: "solid",
      solidColor: "#000000",
      primaryColor: params.primaryColor,
      secondaryColor: params.secondaryColor,
    },
    elements,
    rankingRows: params.rows,
  };
}
