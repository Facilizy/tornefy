import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Download, Image as ImageIcon, Layers, LayoutTemplate, Palette, FileStack, Lightbulb, Settings2, SlidersHorizontal } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import TornefyLogo from "@/components/TornefyLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TabDef = {
  value: string;
  label: string;
  content: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onExport: () => void;
  exportDisabled?: boolean;
  formatValue?: string;
  onFormatChange?: (v: string) => void;
  /** Quando true, não renderiza o header (usado quando existe TopBar externa estilo Canva). */
  hideHeader?: boolean;
  /** Controla tab ativa externamente (opcional). */
  value?: string;
  onValueChange?: (v: string) => void;
  /** Quando preenchido, renderiza um overlay por cima das tabs (ex.: propriedades ao selecionar). */
  overlayTitle?: string;
  overlay?: ReactNode;
  onCloseOverlay?: () => void;
  children: ReactNode;
};

export function LeftDock({
  title,
  subtitle,
  onBack,
  onExport,
  exportDisabled,
  formatValue,
  onFormatChange,
  hideHeader = false,
  value,
  onValueChange,
  overlayTitle,
  overlay,
  onCloseOverlay,
  children,
}: Props) {
  const tabs = useTabs(children);
  const defaultTab = useMemo(() => tabs[0]?.value ?? "elements", [tabs]);
  const [internalTab, setInternalTab] = useState(defaultTab);
  const tab = value ?? internalTab;
  const setTab = (v: string) => {
    onValueChange?.(v);
    if (value == null) setInternalTab(v);
  };

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{ background: "#0d0d14", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* Top header */}
      {!hideHeader ? (
        <div className="shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="px-4 h-14 flex items-center gap-3">
            <button onClick={onBack} className="inline-flex items-center gap-2" title="Voltar">
              <TornefyLogo className="h-6" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{title}</div>
              {subtitle ? <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{subtitle}</div> : null}
            </div>
          </div>

          <div className="px-4 pb-3 flex items-center gap-2">
            {formatValue && onFormatChange ? (
              <Select value={formatValue} onValueChange={onFormatChange}>
                <SelectTrigger className="h-9 flex-1 bg-white/5 border-white/10 text-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stories">Gerar Story</SelectItem>
                  <SelectItem value="feed">Gerar Post</SelectItem>
                  <SelectItem value="overlay">Gerar Overlay</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <Button
              onClick={onExport}
              disabled={exportDisabled}
              className="gap-2 text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Rail de ícones — versão escura premium */}
          <div
            className="shrink-0 px-1.5 pt-3 pb-3 border-r flex flex-col gap-1"
            style={{ background: "#080810", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <TabsList className="flex flex-col gap-1 bg-transparent p-0">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150",
                    "text-white/40 hover:text-white/70",
                    "data-[state=active]:text-white data-[state=active]:bg-white/10",
                  )}
                  aria-label={t.label}
                  title={t.label}
                >
                  {getTabIcon(t.value)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Painel de conteúdo */}
          <div
            className="relative flex-1 overflow-hidden"
            style={{ background: "#0d0d14" }}
          >
            <ScrollArea className="h-full">
              {tabs.map((t) => (
                <TabsContent key={t.value} value={t.value} className="m-0">
                  {t.content}
                </TabsContent>
              ))}
            </ScrollArea>

            {overlay ? (
              <div className="absolute inset-0" style={{ background: "#0d0d14" }}>
                <div
                  className="h-12 px-3 border-b flex items-center justify-between"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="text-sm font-semibold text-white truncate">{overlayTitle || "Propriedades"}</div>
                  {onCloseOverlay ? (
                    <button
                      type="button"
                      className="text-xs hover:text-white transition-colors"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                      onClick={onCloseOverlay}
                    >
                      Voltar
                    </button>
                  ) : null}
                </div>
                <ScrollArea className="h-[calc(100%-3rem)]">{overlay}</ScrollArea>
              </div>
            ) : null}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

LeftDock.Tab = function LeftDockTab(_props: { value: string; label: string; children: ReactNode }) {
  return null;
};

function useTabs(children: ReactNode): TabDef[] {
  const arr = Array.isArray(children) ? children : [children];
  const tabs: TabDef[] = [];
  for (const child of arr) {
    if (!child || typeof child !== "object") continue;
    const el = child as any;
    const type = el.type;
    const props = el.props;
    if (type === LeftDock.Tab && props?.value && props?.label) {
      tabs.push({ value: props.value, label: props.label, content: props.children });
    }
  }
  return tabs;
}

function getTabIcon(value: string) {
  switch (value) {
    case "elements":
      return <LayoutTemplate className="h-4 w-4" />;
    case "uploads":
      return <ImageIcon className="h-4 w-4" />;
    case "layers":
      return <Layers className="h-4 w-4" />;
    case "props":
      return <SlidersHorizontal className="h-4 w-4" />;
    case "theme":
      return <Palette className="h-4 w-4" />;
    case "templates":
      return <FileStack className="h-4 w-4" />;
    case "tips":
      return <Lightbulb className="h-4 w-4" />;
    case "settings":
      return <Settings2 className="h-4 w-4" />;
    default:
      return <LayoutTemplate className="h-4 w-4" />;
  }
}
