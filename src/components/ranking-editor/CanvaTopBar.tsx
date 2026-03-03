import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Redo2, Undo2, ZoomIn, ZoomOut, Scan, Save, PanelLeftClose, PanelLeftOpen } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  format: string;
  onFormatChange: (v: string) => void;
  onBack: () => void;
  onExport: () => void;
  onSave?: () => void;
  exportDisabled?: boolean;
  docksVisible?: boolean;
  onToggleDocks?: () => void;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onZoomReset?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

export function CanvaTopBar({
  title,
  subtitle,
  onBack,
  onExport,
  onSave,
  exportDisabled,
  docksVisible,
  onToggleDocks,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  const zoomLabel = zoom != null ? `${Math.round(zoom * 100)}%` : "—";

  return (
    <header
      className="sticky top-0 z-30 w-full border-b"
      style={{ background: "#0d0d14", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="h-14 px-3 flex items-center gap-2">
        {/* Back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-white/70 hover:text-white hover:bg-white/8 shrink-0"
          title="Voltar ao Painel"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Title */}
        <div className="min-w-0 flex-1 pl-1">
          <div className="text-sm font-bold text-white truncate leading-tight">{title}</div>
          {subtitle ? (
            <div className="text-xs truncate leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</div>
          ) : null}
        </div>

        {/* Controls group */}
        <div className="flex items-center gap-1">
          {/* Dock toggle */}
          {onToggleDocks ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleDocks}
              className="text-white/60 hover:text-white hover:bg-white/8"
              title={docksVisible ? "Ocultar painel (Tab)" : "Mostrar painel (Tab)"}
            >
              {docksVisible ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          ) : null}

          {/* Divider */}
          <div className="hidden md:block w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Undo / Redo */}
          <div className="hidden md:flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="text-white/60 hover:text-white hover:bg-white/8 disabled:opacity-30"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="text-white/60 hover:text-white hover:bg-white/8 disabled:opacity-30"
              title="Refazer (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onZoomOut}
              disabled={!onZoomOut}
              className="text-white/60 hover:text-white hover:bg-white/8 disabled:opacity-30"
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onZoomReset}
              disabled={!onZoomReset}
              className="h-9 min-w-[52px] px-2 hover:bg-white/8 disabled:opacity-30 font-mono text-xs tabular-nums"
              style={{ color: "rgba(255,255,255,0.7)" }}
              title="Resetar zoom para 50%"
            >
              {zoomLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onZoomIn}
              disabled={!onZoomIn}
              className="text-white/60 hover:text-white hover:bg-white/8 disabled:opacity-30"
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onZoomFit}
              disabled={!onZoomFit}
              className="text-white/60 hover:text-white hover:bg-white/8 disabled:opacity-30"
              title="Ajustar à tela"
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Save (draft) */}
          {onSave ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onSave}
              className="gap-2 hover:bg-white/8"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Salvar</span>
            </Button>
          ) : null}

          {/* Export CTA */}
          <Button
            onClick={onExport}
            disabled={exportDisabled}
            className="gap-2 font-semibold text-white disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 16px rgba(16,185,129,0.3)",
            }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Baixar PNG</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
