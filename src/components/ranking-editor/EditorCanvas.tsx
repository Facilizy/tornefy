import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { hexToHslTriplet } from "@/lib/color";
import { TornefyFooterMark } from "@/components/ranking-editor/TornefyFooterMark";
import TornefyLogo from "@/components/TornefyLogo";
import type {
  EditorDocument,
  EditorElement,
  EditorGuide,
  BrandMarkElement,
  ImageElement,
  RankingTableColumn,
  RankingTableElement,
  ShapeElement,
} from "./types";

type Props = {
  doc: EditorDocument;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onChange: (next: EditorDocument) => void;
  /** Callback to allow parent to commit history snapshots (undo/redo). */
  onInteractionEnd?: (params: { before: EditorDocument; after: EditorDocument }) => void;
  className?: string;
  zoom?: number;
  /** Quando true, simplifica estilos para export (evita var() no background e remove camadas decorativas). */
  exportMode?: boolean;
  /** UI-only: réguas e guias (linhas) — nunca devem aparecer no export. */
  showRulers?: boolean;
  showGuides?: boolean;
};

type DragState =
  | null
  | {
      id: string;
      startX: number;
      startY: number;
      baseX: number;
      baseY: number;
    };

type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type ResizeState =
  | null
  | {
      id: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      base: { x: number; y: number; w: number; h: number };
    };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
}

function setElement(doc: EditorDocument, id: string, patch: Partial<EditorElement>) {
  return {
    ...doc,
    elements: doc.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)),
  };
}

function readRootTriplet(varName: string): string | null {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

export function EditorCanvas({
  doc,
  selectedIds,
  onSelectIds,
  onChange,
  onInteractionEnd,
  className,
  zoom: zoomProp = 1,
  exportMode = false,
  showRulers = true,
  showGuides = true,
}: Props) {
  const dragRef = useRef<DragState>(null);
  const resizeRef = useRef<ResizeState>(null);
  const guideDragRef = useRef<null | { id: string; orientation: "h" | "v"; start: number; base: number }>(null);
  const guideFromRulerRef = useRef<null | { id: string; orientation: "h" | "v" }>(null);
  const topRulerRef = useRef<HTMLDivElement | null>(null);
  const leftRulerRef = useRef<HTMLDivElement | null>(null);

  const interactionStartDocRef = useRef<EditorDocument | null>(null);
  const didInteractRef = useRef(false);

  const [smartGuides, setSmartGuides] = useState<{ x?: number; y?: number; dx?: number; dy?: number }>({});

  const bgA = doc.background.primaryColor ? hexToHslTriplet(doc.background.primaryColor) : null;
  const bgB = doc.background.secondaryColor ? hexToHslTriplet(doc.background.secondaryColor) : null;
  const bgSolid = doc.background.solidColor ? hexToHslTriplet(doc.background.solidColor) : null;

  const [rootPrimary, setRootPrimary] = useState<string | null>(null);
  const [rootBackground, setRootBackground] = useState<string | null>(null);

  useEffect(() => {
    setRootPrimary(readRootTriplet("--primary"));
    setRootBackground(readRootTriplet("--background"));
  }, []);

  const [bgSignedUrl, setBgSignedUrl] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (doc.background.kind !== "image" || !doc.background.imagePath) {
        setBgSignedUrl(null);
        return;
      }
      try {
        const { data, error } = await supabase.storage.from("ranking-art-assets").createSignedUrl(doc.background.imagePath, 60 * 60);
        if (cancelled) return;
        if (error) throw error;
        setBgSignedUrl(data.signedUrl);
      } catch {
        if (!cancelled) setBgSignedUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.background.imagePath, doc.background.kind]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedIds.length === 0) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const before = doc;
        const after = { ...doc, elements: doc.elements.filter((el) => !selectedIds.includes(el.id)) };
        onChange(after);
        onInteractionEnd?.({ before, after });
        onSelectIds([]);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedIds.length !== 1) return;
        const el = doc.elements.find((x) => x.id === selectedIds[0]);
        if (!el) return;
        const before = doc;
        const copy = {
          ...el,
          id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2),
          x: el.x + 24,
          y: el.y + 24,
        } as EditorElement;
        const after = { ...doc, elements: [...doc.elements, copy] };
        onChange(after);
        onInteractionEnd?.({ before, after });
        onSelectIds([copy.id]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doc, onChange, onInteractionEnd, onSelectIds, selectedIds]);

  const selectedEl = useMemo(() => (selectedIds.length === 1 ? doc.elements.find((e) => e.id === selectedIds[0]) ?? null : null), [doc.elements, selectedIds]);

  const guides = doc.guides ?? [];

  const onPointerDownElement = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) {
        onSelectIds(selectedIds.filter(s => s !== id));
      } else {
        onSelectIds([...selectedIds, id]);
      }
    } else {
      onSelectIds([id]);
    }
    const el = doc.elements.find((x) => x.id === id);
    if (!el || el.locked) return;

    interactionStartDocRef.current = doc;
    didInteractRef.current = false;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      baseX: el.x,
      baseY: el.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const gd = guideDragRef.current;
    if (gd) {
      const delta = (gd.orientation === "v" ? e.clientX : e.clientY) - gd.start;
      const nextPos = clamp(gd.base + delta / zoom, 0, gd.orientation === "v" ? doc.width : doc.height);
      didInteractRef.current = true;
      onChange({
        ...doc,
        guides: (doc.guides ?? []).map((g) => (g.id === gd.id ? { ...g, pos: nextPos } : g)),
      });
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      const el = doc.elements.find((x) => x.id === drag.id);
      if (!el) return;

      const baseX = clamp(drag.baseX + dx, 0, doc.width);
      const baseY = clamp(drag.baseY + dy, 0, doc.height);

      const snapped = snapRect(
        { x: baseX, y: baseY, w: el.w, h: el.h },
        {
          docW: doc.width,
          docH: doc.height,
          guides,
          others: doc.elements.filter((x) => x.id !== el.id),
        },
      );

      setSmartGuides({ x: snapped.guideX, y: snapped.guideY, dx: snapped.distX, dy: snapped.distY });
      didInteractRef.current = true;
      onChange(setElement(doc, drag.id, { x: snapped.x, y: snapped.y }));
      return;
    }

    const rs = resizeRef.current;
    if (!rs) return;
    const dx = (e.clientX - rs.startX) / zoom;
    const dy = (e.clientY - rs.startY) / zoom;
    const minSize = 20;

    const lockAspect = e.shiftKey;
    const aspect = rs.base.h !== 0 ? rs.base.w / rs.base.h : 1;

    let { x, y, w, h } = rs.base;

    const applyAspectLock = (nx: number, ny: number, nw: number, nh: number) => {
      if (!lockAspect || !Number.isFinite(aspect) || aspect <= 0) return { nx, ny, nw, nh };

      const base = rs.base;

      // Corner handles: keep the opposite corner fixed.
      if (rs.handle === "se" || rs.handle === "sw" || rs.handle === "ne" || rs.handle === "nw") {
        const ax = rs.handle.includes("w") ? base.x + base.w : base.x;
        const ay = rs.handle.includes("n") ? base.y + base.h : base.y;

        const preferred = Math.abs(nw - base.w) >= Math.abs(nh - base.h) ? "w" : "h";
        if (preferred === "w") nh = nw / aspect;
        else nw = nh * aspect;

        const fx = rs.handle.includes("w") ? ax - nw : ax;
        const fy = rs.handle.includes("n") ? ay - nh : ay;
        return { nx: fx, ny: fy, nw, nh };
      }

      // Side handles: resize and keep centered on the other axis.
      if (rs.handle === "e" || rs.handle === "w") {
        nh = nw / aspect;
        const cy = base.y + base.h / 2;
        ny = cy - nh / 2;
        return { nx, ny, nw, nh };
      }
      if (rs.handle === "n" || rs.handle === "s") {
        nw = nh * aspect;
        const cx = base.x + base.w / 2;
        nx = cx - nw / 2;
        return { nx, ny, nw, nh };
      }

      return { nx, ny, nw, nh };
    };

    const apply = (nx: number, ny: number, nw: number, nh: number) => {
      const locked = applyAspectLock(nx, ny, nw, nh);
      nx = locked.nx;
      ny = locked.ny;
      nw = locked.nw;
      nh = locked.nh;

      const clampedW = Math.max(minSize, nw);
      const clampedH = Math.max(minSize, nh);

      const snapped = snapRect(
        { x: clamp(nx, 0, doc.width), y: clamp(ny, 0, doc.height), w: clampedW, h: clampedH },
        {
          docW: doc.width,
          docH: doc.height,
          guides,
          others: doc.elements.filter((x) => x.id !== rs.id),
        },
      );
      setSmartGuides({ x: snapped.guideX, y: snapped.guideY, dx: snapped.distX, dy: snapped.distY });
      didInteractRef.current = true;
      onChange(setElement(doc, rs.id, { x: snapped.x, y: snapped.y, w: snapped.w, h: snapped.h }));
    };

    switch (rs.handle) {
      case "e":
        apply(x, y, w + dx, h);
        break;
      case "s":
        apply(x, y, w, h + dy);
        break;
      case "w":
        apply(x + dx, y, w - dx, h);
        break;
      case "n":
        apply(x, y + dy, w, h - dy);
        break;
      case "ne":
        apply(x, y + dy, w + dx, h - dy);
        break;
      case "nw":
        apply(x + dx, y + dy, w - dx, h - dy);
        break;
      case "se":
        apply(x, y, w + dx, h + dy);
        break;
      case "sw":
        apply(x + dx, y, w - dx, h + dy);
        break;
    }
  };

  const onPointerUp = (e?: React.PointerEvent) => {
    // Remove guide when dropped back on ruler (Photoshop-like)
    const gd = guideDragRef.current;
    const fromRuler = guideFromRulerRef.current;
    if (gd && e && (topRulerRef.current || leftRulerRef.current)) {
      const inTopRuler = (() => {
        const r = topRulerRef.current?.getBoundingClientRect();
        if (!r) return false;
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      })();
      const inLeftRuler = (() => {
        const r = leftRulerRef.current?.getBoundingClientRect();
        if (!r) return false;
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      })();

      const shouldRemove = gd.orientation === "v" ? inTopRuler : inLeftRuler;
      if (shouldRemove) {
        onChange({
          ...doc,
          guides: (doc.guides ?? []).filter((g) => g.id !== gd.id),
        });
      }
    }

    const before = interactionStartDocRef.current;
    const after = doc;

    if (before && didInteractRef.current) {
      onInteractionEnd?.({ before, after });
    }

    // Clear refs
    dragRef.current = null;
    resizeRef.current = null;
    guideDragRef.current = null;
    guideFromRulerRef.current = null;
    interactionStartDocRef.current = null;
    didInteractRef.current = false;
    setSmartGuides({});
  };

  const zoom = Math.max(0.25, Math.min(2, zoomProp));

  const canvasStyle: React.CSSProperties = {
    width: doc.width,
    height: doc.height,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--rank-a" as any]: bgA || "var(--primary)",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--rank-b" as any]: bgB || bgA || "var(--primary)",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--rank-solid" as any]: bgSolid || "var(--background)",
  };

  // Para exportação via html-to-image: evita var() no background (costuma serializar como preto).
  const exportA = bgA || rootPrimary;
  const exportB = bgB || bgA || rootPrimary;
  const exportBg = rootBackground || bgSolid || bgA || rootPrimary;
  const exportSolid = bgSolid || rootBackground || bgA || rootPrimary;

  const gradientAngle = clamp(Number(doc.background.gradientAngle ?? 135), 0, 360);
  const gradientMid = clamp(Number(doc.background.gradientMid ?? (doc.background.kind === "gradient" ? 50 : 35)), 0, 100);

  const canvasBg = (() => {
    if (!exportMode || !exportA || !exportB || !exportBg || !exportSolid) {
      // Mantém o comportamento atual (melhor integrado ao tema) quando não estiver exportando.
      return doc.background.kind === "solid"
        ? "hsl(var(--rank-solid) / 1)"
        : doc.background.kind === "gradient"
          ? `linear-gradient(${gradientAngle}deg, hsl(var(--rank-a) / 0.92) 0%, hsl(var(--rank-b) / 0.78) ${gradientMid}%, hsl(var(--background) / 0.92) 100%)`
          : doc.background.kind === "image"
            ? "hsl(var(--background) / 1)"
            : `linear-gradient(${gradientAngle}deg, hsl(var(--rank-a) / 0.90) 0%, hsl(var(--rank-b) / 0.70) ${gradientMid}%, hsl(var(--background) / 0.92) 100%)`;
    }

    if (doc.background.kind === "solid") return `hsl(${exportSolid} / 1)`;
    if (doc.background.kind === "image") return `hsl(${exportBg} / 1)`;
    if (doc.background.kind === "gradient") {
      return `linear-gradient(${gradientAngle}deg, hsl(${exportA} / 0.92) 0%, hsl(${exportB} / 0.78) ${gradientMid}%, hsl(${exportBg} / 0.92) 100%)`;
    }
    return `linear-gradient(${gradientAngle}deg, hsl(${exportA} / 0.90) 0%, hsl(${exportB} / 0.70) ${gradientMid}%, hsl(${exportBg} / 0.92) 100%)`;
  })();

  return (
    <div className={cn("w-full", className)}>
      {/* workspace */}
      <div
        className={cn(
          // você pediu: artboard sempre centralizado (não "subir")
          "relative flex min-h-full items-center justify-center p-6",
          !exportMode ? "bg-background" : "bg-transparent",
        )}
      >
        {!exportMode ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(to_right, hsl(var(--border) / 0.22) 1px, transparent 1px), linear-gradient(to_bottom, hsl(var(--border) / 0.22) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        ) : null}
        <div className="relative" style={{ width: doc.width * zoom, height: doc.height * zoom }}>
          {showRulers && !exportMode ? (
            <Rulers
              doc={doc}
              zoom={zoom}
              topRef={topRulerRef}
              leftRef={leftRulerRef}
              onStartGuide={(orientation, client, rulerRect) => {
                const id = uid();
                const basePos = orientation === "v" ? (client.x - rulerRect.left) / zoom : (client.y - rulerRect.top) / zoom;
                const pos = clamp(basePos, 0, orientation === "v" ? doc.width : doc.height);

                onChange({
                  ...doc,
                  guides: [...(doc.guides ?? []), { id, orientation, pos }],
                });

                // Start dragging immediately
                guideFromRulerRef.current = { id, orientation };
                guideDragRef.current = {
                  id,
                  orientation,
                  start: orientation === "v" ? client.x : client.y,
                  base: pos,
                };
              }}
            />
          ) : null}

          {/* barra flutuante removida (edição via painéis laterais, estilo Adobe) */}

          <div
            className={cn(
              // mantém a moldura do artboard, mas quem manda no radius da tabela é a própria tabela
              "relative overflow-hidden rounded-xl border bg-background shadow-sm",
            )}
            style={{
              ...canvasStyle,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              background: canvasBg,
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerDown={() => onSelectIds([])}
          >
            {/* Background image layer */}
            {doc.background.kind === "image" && bgSignedUrl ? (
              <img
                src={bgSignedUrl}
                alt="Fundo"
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full",
                  doc.background.imageFit === "contain" ? "object-contain" : "object-cover",
                )}
                loading="lazy"
              />
            ) : null}

            {/* ambient texture */}
            {!exportMode ? (
              <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,hsl(var(--foreground)/0.35),transparent_45%),radial-gradient(circle_at_80%_10%,hsl(var(--foreground)/0.18),transparent_55%),radial-gradient(circle_at_60%_90%,hsl(var(--foreground)/0.22),transparent_55%)]" />
            ) : null}

            {/* user guides */}
            {showGuides && !exportMode
              ? (doc.guides ?? []).map((g) => (
                  <GuideLine
                    key={g.id}
                    g={g}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
                      guideDragRef.current = {
                        id: g.id,
                        orientation: g.orientation,
                        start: g.orientation === "v" ? ev.clientX : ev.clientY,
                        base: g.pos,
                      };
                    }}
                  />
                ))
              : null}

            {/* smart snap guides */}
            {!exportMode && smartGuides.x != null ? (
              <>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/60"
                  style={{ left: smartGuides.x }}
                />
                {smartGuides.dx != null ? (
                  <div
                    className="pointer-events-none absolute top-2 rounded-md border bg-popover/80 px-2 py-0.5 text-[11px] text-foreground shadow-sm"
                    style={{ left: smartGuides.x + 8 }}
                  >
                    {Math.round(smartGuides.dx)}px
                  </div>
                ) : null}
              </>
            ) : null}
            {!exportMode && smartGuides.y != null ? (
              <>
                <div
                  className="pointer-events-none absolute left-0 right-0 h-px bg-primary/60"
                  style={{ top: smartGuides.y }}
                />
                {smartGuides.dy != null ? (
                  <div
                    className="pointer-events-none absolute left-2 rounded-md border bg-popover/80 px-2 py-0.5 text-[11px] text-foreground shadow-sm"
                    style={{ top: smartGuides.y + 8 }}
                  >
                    {Math.round(smartGuides.dy)}px
                  </div>
                ) : null}
              </>
            ) : null}

            {doc.elements.map((el) => (
              <ElementView
                key={el.id}
                doc={doc}
                el={el}
                selected={selectedIds.includes(el.id)}
                onPointerDown={(e) => onPointerDownElement(e, el.id)}
              />
            ))}

            {selectedEl && !exportMode ? <SelectionOutline el={selectedEl} /> : null}

            {selectedEl && !selectedEl.locked && !exportMode ? (
              <ResizeHandles
                el={selectedEl}
                zoom={zoom}
                onStart={(handle, e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  resizeRef.current = {
                    id: selectedEl.id,
                    handle,
                    startX: e.clientX,
                    startY: e.clientY,
                    base: { x: selectedEl.x, y: selectedEl.y, w: selectedEl.w, h: selectedEl.h },
                  };
                }}
              />
            ) : null}

            {/* Logo fixa Tornefy (rodapé do canvas, entra na exportação) */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
              style={{ zIndex: 99999 }}
            >
              <TornefyFooterMark className="h-6 opacity-90" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideLine({ g, onPointerDown }: { g: EditorGuide; onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void }) {
  return g.orientation === "v" ? (
    <div
      className="absolute top-0 bottom-0 w-px bg-accent/80 cursor-col-resize"
      style={{ left: g.pos }}
      onPointerDown={onPointerDown}
      title="Arraste para mover a guia"
    />
  ) : (
    <div
      className="absolute left-0 right-0 h-px bg-accent/80 cursor-row-resize"
      style={{ top: g.pos }}
      onPointerDown={onPointerDown}
      title="Arraste para mover a guia"
    />
  );
}

function Rulers({
  doc,
  zoom,
  topRef,
  leftRef,
  onStartGuide,
}: {
  doc: EditorDocument;
  zoom: number;
  topRef: React.RefObject<HTMLDivElement | null>;
  leftRef: React.RefObject<HTMLDivElement | null>;
  onStartGuide: (orientation: "h" | "v", client: { x: number; y: number }, rulerRect: DOMRect) => void;
}) {
  const step = 50;
  const ticksX = Math.ceil(doc.width / step);
  const ticksY = Math.ceil(doc.height / step);

  return (
    <>
      {/* top ruler */}
      <div
        ref={topRef}
        className="pointer-events-auto absolute left-6 top-0 h-6 bg-background/70 border border-border/60 rounded-md overflow-hidden select-none"
        style={{ width: doc.width * zoom }}
        onPointerDown={(e) => {
          // Create vertical guide
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          onStartGuide("v", { x: e.clientX, y: e.clientY }, rect);
        }}
      >
        <div className="relative h-full" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {Array.from({ length: ticksX + 1 }).map((_, i) => (
            <div key={i} className="absolute top-0 h-full" style={{ left: i * step }}>
              <div className="w-px h-full bg-border/60" />
              <div className="absolute top-0 left-1 text-[10px] text-muted-foreground">{i * step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* left ruler */}
      <div
        ref={leftRef}
        className="pointer-events-auto absolute left-0 top-6 w-6 bg-background/70 border border-border/60 rounded-md overflow-hidden select-none"
        style={{ height: doc.height * zoom }}
        onPointerDown={(e) => {
          // Create horizontal guide
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          onStartGuide("h", { x: e.clientX, y: e.clientY }, rect);
        }}
      >
        <div className="relative w-full" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {Array.from({ length: ticksY + 1 }).map((_, i) => (
            <div key={i} className="absolute left-0 w-full" style={{ top: i * step }}>
              <div className="h-px w-full bg-border/60" />
              <div className="absolute left-1 top-0 text-[10px] text-muted-foreground">{i * step}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function snapRect(
  rect: { x: number; y: number; w: number; h: number },
  ctx: { docW: number; docH: number; guides: EditorGuide[]; others: EditorElement[] },
) {
  const threshold = 8;

  const candidatesX: number[] = [0, ctx.docW / 2, ctx.docW];
  const candidatesY: number[] = [0, ctx.docH / 2, ctx.docH];

  for (const g of ctx.guides) {
    if (g.orientation === "v") candidatesX.push(g.pos);
    else candidatesY.push(g.pos);
  }

  for (const o of ctx.others) {
    candidatesX.push(o.x, o.x + o.w / 2, o.x + o.w);
    candidatesY.push(o.y, o.y + o.h / 2, o.y + o.h);
  }

  let guideX: number | undefined;
  let guideY: number | undefined;

  const snap1D = (vals: { start: number; mid: number; end: number }, candidates: number[]) => {
    // Prefer smaller deltas; break ties by preferring mid alignment (feels more "Canva")
    let best = { delta: 0, g: undefined as number | undefined, abs: Infinity, which: "start" as "start" | "mid" | "end" };
    for (const c of candidates) {
      const dStart = c - vals.start;
      const dMid = c - vals.mid;
      const dEnd = c - vals.end;
      for (const [which, d] of [
        ["mid", dMid],
        ["start", dStart],
        ["end", dEnd],
      ] as const) {
        const ad = Math.abs(d);
        if (ad <= threshold) {
          const better = ad < best.abs;
          const tieBetter = ad === best.abs && which === "mid" && best.which !== "mid";
          if (better || tieBetter) best = { delta: d, g: c, abs: ad, which };
        }
      }
    }
    return best;
  };

  const sx = snap1D({ start: rect.x, mid: rect.x + rect.w / 2, end: rect.x + rect.w }, candidatesX);
  const sy = snap1D({ start: rect.y, mid: rect.y + rect.h / 2, end: rect.y + rect.h }, candidatesY);

  const x = clamp(rect.x + sx.delta, 0, ctx.docW);
  const y = clamp(rect.y + sy.delta, 0, ctx.docH);
  if (sx.g != null) guideX = sx.g;
  if (sy.g != null) guideY = sy.g;

  return { x, y, w: rect.w, h: rect.h, guideX, guideY, distX: sx.abs !== Infinity ? sx.abs : undefined, distY: sy.abs !== Infinity ? sy.abs : undefined };
}

function SelectionOutline({ el }: { el: EditorElement }) {
  return (
    <div
      className="pointer-events-none absolute rounded-md ring-2 ring-ring"
      style={{
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "top left",
      }}
    />
  );
}

function ResizeHandles({
  el,
  zoom,
  onStart,
}: {
  el: EditorElement;
  zoom: number;
  onStart: (handle: ResizeHandle, e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const s = Math.max(10, 10 / zoom);
  const base = "absolute bg-background border border-ring rounded-sm";

  const handle = (h: ResizeHandle, style: React.CSSProperties, cursor: string) => (
    <div
      key={h}
      className={cn(base, "pointer-events-auto")}
      style={{ width: s, height: s, ...style, cursor }}
      onPointerDown={(e) => onStart(h, e)}
    />
  );

  return (
    <div className="absolute pointer-events-none" style={{ left: el.x, top: el.y, width: el.w, height: el.h }}>
      {handle("nw", { left: -s / 2, top: -s / 2 }, "nwse-resize")}
      {handle("ne", { right: -s / 2, top: -s / 2 }, "nesw-resize")}
      {handle("sw", { left: -s / 2, bottom: -s / 2 }, "nesw-resize")}
      {handle("se", { right: -s / 2, bottom: -s / 2 }, "nwse-resize")}

      {handle("n", { left: "50%", top: -s / 2, transform: "translateX(-50%)" }, "ns-resize")}
      {handle("s", { left: "50%", bottom: -s / 2, transform: "translateX(-50%)" }, "ns-resize")}
      {handle("w", { left: -s / 2, top: "50%", transform: "translateY(-50%)" }, "ew-resize")}
      {handle("e", { right: -s / 2, top: "50%", transform: "translateY(-50%)" }, "ew-resize")}
    </div>
  );
}

function ElementView({
  doc,
  el,
  selected,
  onPointerDown,
}: {
  doc: EditorDocument;
  el: EditorElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className={cn(
        "absolute",
        selected ? "" : "hover:opacity-95",
        el.locked ? "cursor-not-allowed" : "cursor-move",
      )}
      style={{
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        opacity: el.opacity,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "top left",
      }}
      onPointerDown={onPointerDown}
    >
      {el.type === "brand_mark" ? <BrandMarkView el={el as BrandMarkElement} /> : null}

      {el.type === "text" ? (
        <div
          className={cn(
            "h-full w-full select-none whitespace-pre-wrap",
            el.align === "center" ? "text-center" : el.align === "right" ? "text-right" : "text-left",
            el.uppercase ? "uppercase" : "",
          )}
          style={{
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            letterSpacing: el.letterSpacing,
            ...(el.splitColor
              ? (() => {
                  const leftTriplet = el.color ? hexToHslTriplet(el.color) : null;
                  const rightTriplet = hexToHslTriplet(el.splitColor);
                  const left = leftTriplet ? `hsl(${leftTriplet} / 1)` : "hsl(var(--foreground))";
                  const right = rightTriplet ? `hsl(${rightTriplet} / 1)` : "hsl(var(--foreground))";
                  return {
                    backgroundImage: `linear-gradient(90deg, ${left} 0 50%, ${right} 50% 100%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                  } as React.CSSProperties;
                })()
              : {
                  color: el.color ? `hsl(${hexToHslTriplet(el.color) ?? "var(--foreground)"} / 1)` : undefined,
                }),
          }}
        >
          {el.text}
        </div>
      ) : null}

      {el.type === "shape" ? (
        <ShapeView el={el} />
      ) : null}

      {el.type === "image" ? <StorageImage el={el} /> : null}

      {el.type === "ranking_table" ? <RankingTable doc={doc} el={el} /> : null}
    </div>
  );
}

function BrandMarkView({ el }: { el: BrandMarkElement }) {
  return (
    <div className="h-full w-full flex items-center">
      <TornefyLogo className="h-full w-auto" />
    </div>
  );
}

function ShapeView({ el }: { el: ShapeElement }) {
  const fillTriplet = el.fillColor ? hexToHslTriplet(el.fillColor) : null;
  const strokeTriplet = el.strokeColor ? hexToHslTriplet(el.strokeColor) : null;

  const commonStyle: React.CSSProperties = {
    borderWidth: el.strokeWidth,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--shape-fill" as any]: fillTriplet || "transparent",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ["--shape-stroke" as any]: strokeTriplet || "var(--foreground)",
    background: fillTriplet ? "hsl(var(--shape-fill) / 0.55)" : "transparent",
    borderColor: strokeTriplet ? "hsl(var(--shape-stroke) / 0.85)" : "hsl(var(--foreground) / 0.75)",
  };

  // Rect/round/circle/line are CSS-based; triangle/star/arrow are SVG.
  if (el.shapeType === "triangle" || el.shapeType === "star" || el.shapeType === "arrow") {
    const fill = fillTriplet ? "hsl(var(--shape-fill) / 0.65)" : "transparent";
    const stroke = strokeTriplet ? "hsl(var(--shape-stroke) / 0.85)" : "hsl(var(--foreground) / 0.75)";

    const triangle = "M 50 8 L 92 92 L 8 92 Z";
    const star = "M50 6 L61 38 L95 38 L67 58 L78 90 L50 71 L22 90 L33 58 L5 38 L39 38 Z";
    const arrow = "M12 44 H68 V28 L92 50 L68 72 V56 H12 Z";
    const d = el.shapeType === "triangle" ? triangle : el.shapeType === "star" ? star : arrow;

    // IMPORTANTE: não aplica background/border no <svg>, senão vira "caixa" retangular.
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d={d} fill={fill} stroke={stroke} strokeWidth={Math.max(1, el.strokeWidth)} />
      </svg>
    );
  }

  if (el.shapeType === "line") {
    return (
      <div
        className={cn("h-full w-full")}
        style={{
          height: el.strokeWidth,
          marginTop: (el.h - el.strokeWidth) / 2,
          background: fillTriplet ? "hsl(var(--shape-fill) / 0.85)" : "hsl(var(--foreground) / 0.65)",
          borderRadius: 999,
        }}
      />
    );
  }

  return (
    <div
      className={cn("h-full w-full")}
      style={{
        ...commonStyle,
        borderStyle: el.strokeWidth > 0 ? "solid" : "none",
        borderRadius: el.shapeType === "circle" ? 9999 : el.shapeType === "round" ? el.radius : 0,
      }}
    />
  );
}

function RankingTable({ doc, el }: { doc: EditorDocument; el: RankingTableElement }) {
  const rows = doc.rankingRows.slice(0, Math.max(1, el.limit));
  const headerBg = el.headerBgColor || undefined;
  const headerText = el.headerTextColor || undefined;
  const rowTextTriplet = el.rowTextColor ? hexToHslTriplet(el.rowTextColor) : null;
  const rowText = rowTextTriplet ? `hsl(${rowTextTriplet} / 1)` : "hsl(var(--foreground))";
  const rowBg = el.rowBgColor || undefined;
  const rowAltBg = el.rowAltBgColor || undefined;
  const rowBorder = el.rowBorderColor || undefined;
  // você pediu: começar SEM bordas. Se não houver config, assume 0.
  const borderWidth = typeof el.rowBorderWidth === "number" ? el.rowBorderWidth : 0;
  // default continua 0 (quadrada), mas precisa respeitar personalização
  const radius = typeof el.cornerRadius === "number" ? Math.max(0, el.cornerRadius) : 0;
  const padX = typeof el.cellPaddingX === "number" ? el.cellPaddingX : 8;
  const padY = typeof el.cellPaddingY === "number" ? el.cellPaddingY : 6;
  // default continua 0 (sem gap), mas precisa respeitar personalização
  const rowGap = typeof el.rowGap === "number" ? Math.max(0, el.rowGap) : 0;
  const accentW = typeof el.accentBarWidth === "number" ? Math.max(0, el.accentBarWidth) : 0;
  const accentTriplet = el.accentBarColor ? hexToHslTriplet(el.accentBarColor) : null;
  const accent = accentTriplet ? `hsl(${accentTriplet} / 1)` : "hsl(var(--primary))";

  const colDefs = useMemo(() => buildTableGrid(el.columns), [el.columns]);
  const gridTemplateColumns = useMemo(
    () => colDefs.map((c) => c.width).join(" "),
    [colDefs],
  );

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        borderRadius: radius,
        borderWidth,
        borderStyle: borderWidth > 0 ? "solid" : "none",
        borderColor: rowBorder || "hsl(var(--border))",
        backgroundColor: "transparent",
        boxSizing: "border-box",
      }}
    >
      {el.showHeader ? (
        <div
          className="relative"
          style={{
            fontSize: el.headerFontSize,
            paddingInline: padX + accentW,
            paddingBlock: padY,
            backgroundColor: headerBg || "hsl(var(--background) / 0.6)",
            color: headerText || "hsl(var(--foreground))",
            borderBottom: borderWidth > 0 ? `${borderWidth}px solid ${rowBorder || "hsl(var(--border))"}` : "none",
          }}
        >
          <div
            className="grid items-center"
            style={{ gridTemplateColumns, columnGap: 0 }}
          >
            {colDefs.map((c) => (
              <div
                key={c.key}
                className={cn("uppercase tracking-wider", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left")}
                style={{ paddingInline: 6 }}
              >
                {c.header}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col" style={{ fontSize: el.rowFontSize, gap: rowGap, color: rowText }}>
        {rows.map((r, idx) => {
          const isAlt = idx % 2 === 1;
          return (
            <div
              key={r.team_id}
              className="relative overflow-hidden"
              style={{
                paddingInline: padX + accentW,
                paddingBlock: padY,
                backgroundColor: (isAlt ? rowAltBg : rowBg) || "hsl(var(--background) / 0.4)",
                borderRadius: radius,
                borderBottom: borderWidth > 0 ? `${borderWidth}px solid ${rowBorder || "hsl(var(--border))"}` : "none",
              }}
            >
              {accentW > 0 ? (
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: accentW, backgroundColor: accent, opacity: 0.95 }}
                />
              ) : null}
              <div className="grid items-center" style={{ gridTemplateColumns, columnGap: 0 }}>
                {colDefs.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      c.align === "right" ? "text-right tabular-nums" : c.align === "center" ? "text-center tabular-nums" : "text-left",
                    )}
                    style={{ paddingInline: 6 }}
                  >
                    {renderCell(c.key as any, idx + 1, r)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildTableGrid(cols: RankingTableColumn[]) {
  type TableAlign = "left" | "center" | "right";
  // grid único (header/rows) = alinhamento perfeito
  return cols.map((c) => {
    switch (c) {
      case "pos":
        // mais largo para não colar "POS" em "NOME" quando sem gap
        return { key: c, width: "64px", align: "center" as TableAlign, header: "Pos" };
      case "logo":
        // você pediu: sem texto no header da logo
        return { key: c, width: "52px", align: "center" as TableAlign, header: "" };
      case "tag":
        return { key: c, width: "88px", align: "left" as TableAlign, header: "Tag" };
      case "name":
        return { key: c, width: "1fr", align: "left" as TableAlign, header: "Nome" };
      case "matches":
        // abreviações pedidas
        return { key: c, width: "64px", align: "center" as TableAlign, header: "P" };
      case "kills":
        return { key: c, width: "64px", align: "center" as TableAlign, header: "K" };
      case "points":
        return { key: c, width: "72px", align: "center" as TableAlign, header: "Pts" };
      case "wins":
        return { key: c, width: "64px", align: "center" as TableAlign, header: "V" };
      default:
        return { key: c, width: "1fr", align: "left" as TableAlign, header: String(c) };
    }
  });
}

function renderCell(col: RankingTableColumn, pos: number, r: any) {
  if (col === "pos") return <span className="font-semibold">{pos}</span>;
  if (col === "logo") {
    return r.logo_url ? (
      <img
        src={r.logo_url}
        alt={r.name}
        className="h-8 w-8 object-cover border border-border/60 bg-background/60"
        loading="lazy"
      />
    ) : (
      <div className="h-8 w-8 border border-dashed border-border/60 bg-background/40" />
    );
  }
  if (col === "tag") return <span className="font-semibold truncate">{r.tag}</span>;
  if (col === "name") return <span className="truncate font-semibold">{r.name}</span>;
  if (col === "matches") return <span>{r.matches}</span>;
  if (col === "kills") return <span className="font-semibold">{r.kills}</span>;
  if (col === "points") return <span className="font-extrabold">{r.points}</span>;
  if (col === "wins") return <span>{r.wins}</span>;
  return null;
}

function StorageImage({ el }: { el: ImageElement }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from("ranking-art-assets")
          .createSignedUrl(el.storagePath, 60 * 60);
        if (cancelled) return;
        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch {
        if (!cancelled) setSignedUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.storagePath]);

  if (!signedUrl) {
    return <div className="h-full w-full rounded-lg border bg-muted/30" />;
  }

  return (
    <img
      src={signedUrl}
      alt="Imagem do template"
      className={cn("h-full w-full border bg-transparent", el.fit === "contain" ? "object-contain" : "object-cover")}
      style={{ borderRadius: el.borderRadius }}
      loading="lazy"
    />
  );
}
