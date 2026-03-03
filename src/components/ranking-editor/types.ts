import type { RankingArtFormat, TeamRankRow } from "@/components/ranking-art/types";

export type EditorFormat = RankingArtFormat;

export type CanvasSize = { w: number; h: number };

export const EDITOR_SIZE: Record<EditorFormat, CanvasSize> = {
  feed: { w: 1080, h: 1080 },
  stories: { w: 1080, h: 1920 },
  overlay: { w: 1920, h: 1080 },
};

export type EditorDocument = {
  id: string;
  name: string;
  format: EditorFormat;
  width: number;
  height: number;
  guides?: EditorGuide[];
  /** Camadas + grupos */
  selectedIds?: string[];
  groups?: EditorGroup[];
  background: {
    kind: "training-gradient" | "solid" | "gradient" | "image";
    /** Hex (#RRGGBB). Used by training-gradient/gradient */
    primaryColor?: string | null;
    /** Hex (#RRGGBB). Used by training-gradient/gradient */
    secondaryColor?: string | null;
    /** Ângulo do degradê (graus). Usado em training-gradient/gradient. */
    gradientAngle?: number | null;
    /** Ponto intermediário do degradê (0-100). Usado em training-gradient/gradient. */
    gradientMid?: number | null;
    /** Hex (#RRGGBB). Used by solid */
    solidColor?: string | null;
    /** storage bucket: ranking-art-assets, path: {userId}/... */
    imagePath?: string | null;
    imageFit?: "cover" | "contain";
  };
  elements: EditorElement[];
  rankingRows: TeamRankRow[];
};

export type EditorGroup = {
  id: string;
  name?: string;
  /** IDs dos elementos que pertencem a este grupo */
  elementIds: string[];
  locked?: boolean;
};

export type EditorGuide = {
  id: string;
  orientation: "h" | "v";
  pos: number;
};

export type CommonElement = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  /** Elementos com o mesmo groupId movem-se juntos quando selecionados */
  groupId?: string | null;
};

export type TextElement = CommonElement & {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
  uppercase?: boolean;
  letterSpacing?: number;
  /** Hex (#RRGGBB) */
  color?: string | null;
  /** Cor da metade direita do texto (split 50/50). Hex (#RRGGBB) */
  splitColor?: string | null;
};

export type ShapeElement = CommonElement & {
  type: "shape";
  shapeType: "rect" | "round" | "circle" | "line" | "triangle" | "star" | "arrow";
  strokeWidth: number;
  radius: number;
  /** Hex (#RRGGBB) */
  fillColor?: string | null;
  /** Hex (#RRGGBB) */
  strokeColor?: string | null;
};

export type ImageElement = CommonElement & {
  type: "image";
  storagePath: string; // bucket: ranking-art-assets, path: {userId}/...
  fit: "cover" | "contain";
  borderRadius: number;
};

 export type RankingTableColumn = "pos" | "logo" | "tag" | "name" | "points" | "kills" | "matches" | "wins";

export type RankingTableElement = CommonElement & {
  type: "ranking_table";
  limit: number;
  showHeader: boolean;
  columns: RankingTableColumn[];
  rowFontSize: number;
  headerFontSize: number;
  density: "compact" | "comfortable";
  /** Cor do texto das linhas (não inclui header). Hex (#RRGGBB) */
  rowTextColor?: string | null;
  /** Espaçamento vertical entre linhas (px). Se omitido, usa preset por densidade. */
  rowGap?: number;
  /** Barra de destaque à esquerda (px). */
  accentBarWidth?: number;
  /** Cor da barra de destaque (Hex #RRGGBB). */
  accentBarColor?: string | null;
  /** Hex (#RRGGBB) */
  headerBgColor?: string | null;
  /** Hex (#RRGGBB) */
  headerTextColor?: string | null;
  /** Hex (#RRGGBB) */
  rowBgColor?: string | null;
  /** Hex (#RRGGBB) para linhas alternadas */
  rowAltBgColor?: string | null;
  /** Hex (#RRGGBB) */
  rowBorderColor?: string | null;
  rowBorderWidth?: number;
  cornerRadius?: number;
  cellPaddingX?: number;
  cellPaddingY?: number;
};

export type BrandMarkElement = CommonElement & {
  type: "brand_mark";
  variant: "full" | "mark";
};

export type EditorElement = TextElement | ShapeElement | ImageElement | RankingTableElement | BrandMarkElement;
