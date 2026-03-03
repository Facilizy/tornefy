import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Radio } from "lucide-react";
import { ActionTile } from "@/components/ActionTile";
import { copyToClipboard } from "@/components/broadcast-links/clipboard";
import { buildUrl, PresetKey } from "@/components/broadcast-links/url";
import { PreviewEmbed } from "@/components/broadcast-links/PreviewEmbed";
import { supabase } from "@/integrations/supabase/client";

type ColumnKey = "rank" | "logo" | "tag" | "team" | "wins" | "matches" | "kills" | "points";

const DEFAULT_COL_ORDER: ColumnKey[] = [
  "rank",
  "logo",
  "tag",
  "team",
  "wins",
  "matches",
  "kills",
  "points",
];

type Props = {
  trainingId: string;
  triggerVariant?: "button" | "tile";
};

export function BroadcastLinksDialog({ trainingId, triggerVariant = "button" }: Props) {
  const [open, setOpen] = useState(false);

  // Usa a URL atual para evitar "página não existe" antes de publicar.
  // (No OBS você pode usar o domínio publicado depois de publicar.)
  const baseUrl = window.location.origin;

  // Config rápida
  const [preset, setPreset] = useState<PresetKey>("padrao");

  // Config (valores reais que viram params)
  const [limit, setLimit] = useState<string>("8");
  const [cols, setCols] = useState<"1" | "2">("2");
  const [logo, setLogo] = useState<boolean>(true);
  const [gap, setGap] = useState<string>("48");
  const [font, setFont] = useState<string>("18");
  const [fontColor, setFontColor] = useState<string>("#ffffff");
  const [firstColor, setFirstColor] = useState<string>("#a855f7");
  const [firstColorTouched, setFirstColorTouched] = useState(false);
  const [header, setHeader] = useState<boolean>(true);

  // Colunas extras
  const [matches, setMatches] = useState<boolean>(false);
  const [wins, setWins] = useState<boolean>(false);

  // Colunas exibidas (controle fino)
  // Para manter compatibilidade, começamos com o comportamento atual:
  // - nome, pontos, kills visíveis por padrão
  // - TAG continua inline na coluna de nome, a coluna dedicada de TAG só entra se showTag=true
  const [showTag, setShowTag] = useState<boolean>(false);
  const [showName, setShowName] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [showKills, setShowKills] = useState<boolean>(true);

  // Ordem das colunas (render no overlay)
  const [colOrder, setColOrder] = useState<ColumnKey[]>(DEFAULT_COL_ORDER);

  const [quedaId, setQuedaId] = useState<string>("");
  const [rodadaId, setRodadaId] = useState<string>("");

  // MVP ranking (Top N)
  const [mvpTop, setMvpTop] = useState<string>("10");

  // Estilo visual avançado
  const [headerBg, setHeaderBg] = useState<string>("#020617");
  const [headerText, setHeaderText] = useState<string>("#e5e7eb");
  const [rowBg, setRowBg] = useState<string>("#020617");
  const [rowAltBg, setRowAltBg] = useState<string>("#020617");
  const [rowBorderColor, setRowBorderColor] = useState<string>("#1f2933");
  const [rowBorderWidth, setRowBorderWidth] = useState<string>("1");
  const [cornerRadius, setCornerRadius] = useState<string>("12");
  const [cellPaddingX, setCellPaddingX] = useState<string>("16");
  const [cellPaddingY, setCellPaddingY] = useState<string>("8");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");

  // Preview (apenas fundo atrás do iframe)
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light" | "transparent">("dark");

  const applyPreset = (key: PresetKey) => {
    setPreset(key);

    if (key === "padrao") {
      setCols("2");
      setLogo(true);
      setGap("48");
      setFont("18");
      return;
    }

    if (key === "compacto") {
      setCols("2");
      setLogo(false);
      setGap("24");
      setFont("16");
      return;
    }

    // grande
    setCols("1");
    setLogo(true);
    setGap("48");
    setFont("22");
  };

  const applyStylePreset = (key: "dark" | "clean" | "neon") => {
    if (key === "dark") {
      setHeaderBg("#020617");
      setHeaderText("#e5e7eb");
      setRowBg("#020617");
      setRowAltBg("#0b1220");
      setRowBorderColor("#1f2933");
      setRowBorderWidth("1");
      setCornerRadius("12");
      setCellPaddingX("16");
      setCellPaddingY("8");
      setDensity("comfortable");
      return;
    }

    if (key === "clean") {
      setHeaderBg("#ffffff");
      setHeaderText("#111827");
      setRowBg("#ffffff");
      setRowAltBg("#f3f4f6");
      setRowBorderColor("#e5e7eb");
      setRowBorderWidth("1");
      setCornerRadius("12");
      setCellPaddingX("16");
      setCellPaddingY("10");
      setDensity("comfortable");
      return;
    }

    // neon
    setHeaderBg("#0b1220");
    setHeaderText("#e5e7eb");
    setRowBg("#050914");
    setRowAltBg("#070f24");
    setRowBorderColor("#3b82f6");
    setRowBorderWidth("1");
    setCornerRadius("16");
    setCellPaddingX("18");
    setCellPaddingY("10");
    setDensity("comfortable");
  };

  const applyTransparentTable = () => {
    // Fundo transparente dentro do OBS
    setHeaderBg("");
    setRowBg("");
    setRowAltBg("");
    setRowBorderColor("");
    setRowBorderWidth("0");
  };

  // Puxa cor principal do treino para o 1º lugar (se o usuário ainda não mexeu).
  useEffect(() => {
    if (!open) return;
    if (firstColorTouched) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("trainings").select("primary_color").eq("id", trainingId).maybeSingle();
      const c = String((data as any)?.primary_color ?? "").trim();
      if (!cancelled && c) setFirstColor(c);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, firstColorTouched, trainingId]);

  const resetLayout = () => {
    setCols("2");
    setHeader(true);
    setLogo(true);
    setGap("48");
    setFont("18");
    setLimit("8");
    setMatches(false);
    setWins(false);
    setPreset("padrao");
  };

  const resetColumns = () => {
    setShowTag(false);
    setShowName(true);
    setShowPoints(true);
    setShowKills(true);
    setColOrder(DEFAULT_COL_ORDER);
  };

  const resetStyle = () => {
    setFontColor("#ffffff");
    setFirstColor("#a855f7");
    applyStylePreset("dark");
  };

  const safeGap = String(Math.max(0, Number(gap || 0)));
  const safeFont = String(Math.max(12, Number(font || 12)));
  const safeLimit = String(Math.max(1, Math.min(24, Number(limit || 8))));
  const safeMvpTop = String(Math.max(1, Math.min(24, Number(mvpTop || 10))));
  const safeRowBorderWidth = String(Math.max(0, Math.min(8, Number(rowBorderWidth || 1))));
  const safeCornerRadius = String(Math.max(0, Math.min(48, Number(cornerRadius || 12))));
  const safeCellPaddingX = String(Math.max(0, Math.min(64, Number(cellPaddingX || 16))));
  const safeCellPaddingY = String(Math.max(0, Math.min(32, Number(cellPaddingY || 8))));

  const baseParams = useMemo(
    () => ({
      treino_id: trainingId,
      cols,
      logo: logo ? "1" : "0",
      header: header ? "1" : "0",
      gap: safeGap,
      font: safeFont,
      font_color: fontColor,
      first_color: firstColor,
      matches: matches ? "1" : "0",
      wins: wins ? "1" : "0",
      matches_col: "matches_played",
      wins_col: "wins",
      col_order: colOrder.join(","),
      // Estilo visual avançado
      header_bg: headerBg,
      header_text: headerText,
      row_bg: rowBg,
      row_alt_bg: rowAltBg,
      row_border_color: rowBorderColor,
      row_border_width: safeRowBorderWidth,
      corner_radius: safeCornerRadius,
      cell_px: safeCellPaddingX,
      cell_py: safeCellPaddingY,
      density,
      // Colunas exibidas
      show_tag: showTag ? "1" : "0",
      show_name: showName ? "1" : "0",
      show_points: showPoints ? "1" : "0",
      show_kills: showKills ? "1" : "0",
    }),
    [
      trainingId,
      cols,
      logo,
      header,
      safeGap,
      safeFont,
      fontColor,
      firstColor,
      matches,
      wins,
      headerBg,
      headerText,
      rowBg,
      rowAltBg,
      rowBorderColor,
      safeRowBorderWidth,
      safeCornerRadius,
      safeCellPaddingX,
      safeCellPaddingY,
      density,
      showTag,
      showName,
      showPoints,
      showKills,
      colOrder,
    ]
  );

  const tabelaUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/tabela-geral", {
      ...baseParams,
      limit: safeLimit,
    });
  }, [baseUrl, baseParams, safeLimit]);

  // Preview não precisa ser a tabela inteira; força 1 coluna e poucas linhas.
  const tabelaPreviewUrl = useMemo(() => {
    const previewLimit = String(Math.max(1, Math.min(6, Number(safeLimit || 6))));
    return buildUrl(baseUrl, "/overlays/tabela-geral", {
      ...baseParams,
      cols: "1",
      limit: previewLimit,
    });
  }, [baseUrl, baseParams, safeLimit]);

  const mvpUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/mvp", {
      ...baseParams,
      queda_id: quedaId.trim(),
      rodada_id: rodadaId.trim(),
    });
  }, [baseUrl, baseParams, quedaId, rodadaId]);

  const mvpRankingUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/mvp-ranking", {
      treino_id: trainingId,
      top: safeMvpTop,
      font: safeFont,
      font_color: fontColor,
      first_color: firstColor,
    });
  }, [baseUrl, trainingId, safeMvpTop, safeFont, fontColor, firstColor]);

  const openLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Links (OBS)"
            description="Copie URLs de overlays e configure a tabela/MVP."
            icon={Radio}
          />
        ) : (
          <Button variant="outline" className="w-full justify-start gap-2">
            <Radio className="h-4 w-4" />
            Links (OBS)
          </Button>
        )}
      </DialogTrigger>

       <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Links para OBS</span>
          </DialogTitle>
          <DialogDescription>
            Visão geral com URLs + configurações separadas para <b>Tabela geral</b> e <b>MVP</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs defaultValue="visao" className="w-full">
            <TabsList className="w-full flex">
              <TabsTrigger value="visao" className="flex-1">Visão geral</TabsTrigger>
              <TabsTrigger value="tabela" className="flex-1">Tabela geral</TabsTrigger>
              <TabsTrigger value="mvp" className="flex-1">MVP</TabsTrigger>
            </TabsList>

            <TabsContent value="visao" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Pré-definição</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={preset === "padrao" ? "default" : "outline"}
                      onClick={() => applyPreset("padrao")}
                    >
                      Padrão
                    </Button>
                    <Button
                      type="button"
                      variant={preset === "compacto" ? "default" : "outline"}
                      onClick={() => applyPreset("compacto")}
                    >
                      Compacto
                    </Button>
                    <Button
                      type="button"
                      variant={preset === "grande" ? "default" : "outline"}
                      onClick={() => applyPreset("grande")}
                    >
                      Grande
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label>Link (Tabela geral)</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                      <Input readOnly value={tabelaUrl} />
                        <div className="flex gap-2 sm:gap-2">
                          <Button type="button" variant="outline" onClick={() => openLink(tabelaUrl)}>
                        <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" onClick={() => copyToClipboard(tabelaUrl)}>
                        <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Link (MVP destaque)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={mvpUrl} />
                      <Button type="button" variant="outline" onClick={() => openLink(mvpUrl)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => copyToClipboard(mvpUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Link (MVP ranking)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={mvpRankingUrl} />
                      <Button type="button" variant="outline" onClick={() => openLink(mvpRankingUrl)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => copyToClipboard(mvpRankingUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tabela" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-4">
                  {/* Link + Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Link (Tabela geral)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={previewTheme === "dark" ? "default" : "outline"}
                          onClick={() => setPreviewTheme("dark")}
                        >
                          Preview Dark
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={previewTheme === "light" ? "default" : "outline"}
                          onClick={() => setPreviewTheme("light")}
                        >
                          Preview Light
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={previewTheme === "transparent" ? "default" : "outline"}
                          onClick={() => setPreviewTheme("transparent")}
                        >
                          Transparente
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input readOnly value={tabelaUrl} className="font-mono text-xs" />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => openLink(tabelaUrl)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" onClick={() => copyToClipboard(tabelaUrl)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">
                      <span className="font-medium">Link curto:</span>{" "}
                      {tabelaUrl.length > 96 ? `${tabelaUrl.slice(0, 70)}…${tabelaUrl.slice(-22)}` : tabelaUrl}
                    </p>

                    <div
                      className="rounded-xl border border-border overflow-hidden"
                      style={{
                        background:
                          previewTheme === "dark"
                            ? "hsl(var(--background))"
                            : previewTheme === "light"
                              ? "hsl(0 0% 100%)"
                              : "transparent",
                      }}
                    >
                      <div className="p-3">
                        <PreviewEmbed
                          src={tabelaPreviewUrl}
                          baseHeight={240}
                          maxPreviewHeight={180}
                          transparent={previewTheme === "transparent"}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Preset de estilo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Preset de estilo</p>
                      <Button type="button" size="sm" variant="outline" onClick={resetStyle}>
                        Reset estilo
                      </Button>
                    </div>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value=""
                      onChange={(e) => {
                        const v = e.target.value as "" | "dark" | "clean" | "neon" | "transparent";
                        if (!v) return;
                        if (v === "transparent") applyTransparentTable();
                        else applyStylePreset(v);
                        e.target.value = "";
                      }}
                    >
                      <option value="" disabled>
                        Escolher preset…
                      </option>
                      <option value="dark">Dark (padrão OBS)</option>
                      <option value="clean">Clean (claro)</option>
                      <option value="neon">Neon</option>
                      <option value="transparent">Transparente (fundo)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Aplica cores/bordas/padding/densidade.</p>
                  </div>

                  <Separator />

                  {/* Layout */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Layout</p>
                      <Button type="button" size="sm" variant="outline" onClick={resetLayout}>
                        Reset layout
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <Label>Colunas</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={cols === "1" ? "default" : "outline"}
                          onClick={() => {
                            setCols("1");
                            setPreset("padrao");
                          }}
                          className="flex-1"
                        >
                          1 coluna
                        </Button>
                        <Button
                          type="button"
                          variant={cols === "2" ? "default" : "outline"}
                          onClick={() => {
                            setCols("2");
                            setPreset("padrao");
                          }}
                          className="flex-1"
                        >
                          2 colunas
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Maior (top 1) fica na esquerda.</p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">Mostrar cabeçalho</p>
                        <p className="text-xs text-muted-foreground">Rank/Logo/Nome…</p>
                      </div>
                      <Switch checked={header} onCheckedChange={(v: boolean) => setHeader(v)} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">Mostrar logos</p>
                      </div>
                      <Switch checked={logo} onCheckedChange={(v: boolean) => setLogo(v)} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="gap">Espaço</Label>
                        <Input id="gap" value={gap} onChange={(e) => setGap(e.target.value)} placeholder="48" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="font">Fonte</Label>
                        <Input id="font" value={font} onChange={(e) => setFont(e.target.value)} placeholder="18" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">Linhas (equipes)</p>
                      <p className="text-xs text-muted-foreground">De 1 até 24 equipes.</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="limit">Quantidade (1–24)</Label>
                      <Input id="limit" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="8" />
                    </div>
                  </div>

                  <Separator />

                  {/* Cores básicas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Cores</p>
                      <Button type="button" size="sm" variant="outline" onClick={resetStyle}>
                        Reset cores
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="fontColor">Cor da fonte</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="fontColor"
                            type="color"
                            value={fontColor}
                            onChange={(e) => setFontColor(e.target.value)}
                            className="h-10 w-14 p-1"
                            aria-label="Cor da fonte"
                          />
                          <Input value={fontColor} onChange={(e) => setFontColor(e.target.value)} placeholder="#ffffff" />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="firstColor">Cor do 1º lugar</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="firstColor"
                            type="color"
                            value={firstColor}
                            onChange={(e) => {
                              setFirstColorTouched(true);
                              setFirstColor(e.target.value);
                            }}
                            className="h-10 w-14 p-1"
                            aria-label="Cor do primeiro lugar"
                          />
                          <Input
                            value={firstColor}
                            onChange={(e) => {
                              setFirstColorTouched(true);
                              setFirstColor(e.target.value);
                            }}
                            placeholder="#a855f7"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Aplicado na equipe em 1º lugar.</p>
                      </div>
                    </div>
                  </div>

                  {/* Avançado */}
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer select-none text-sm font-semibold">Avançado</summary>
                    <div className="mt-3 space-y-4">
                      {/* Ordem das colunas */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Ordem das colunas</p>
                        <p className="text-xs text-muted-foreground">Use ↑/↓ para reordenar (Rank sempre fica primeiro).</p>

                        <div className="grid gap-2">
                          {colOrder
                            .filter((k) => k !== "rank")
                            .map((k, idx) => {
                              const i = idx + 1; // offset por rank
                              const move = (dir: -1 | 1) => {
                                setColOrder((prev) => {
                                  const next = [...prev];
                                  const from = i;
                                  const to = Math.max(1, Math.min(next.length - 1, i + dir));
                                  const tmp = next[from];
                                  next[from] = next[to];
                                  next[to] = tmp;
                                  return next;
                                });
                              };

                              const label =
                                k === "logo"
                                  ? "Logo"
                                  : k === "tag"
                                    ? "Tag"
                                    : k === "team"
                                      ? "Nome"
                                      : k === "wins"
                                        ? "Vitórias"
                                        : k === "matches"
                                          ? "Partidas"
                                          : k === "kills"
                                            ? "Kills"
                                            : k === "points"
                                              ? "Pontos"
                                              : k;

                              return (
                                <div key={k} className="flex items-center justify-between rounded-lg border border-border p-2">
                                  <span className="text-sm font-medium">{label}</span>
                                  <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => move(-1)}>
                                      ↑
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => move(1)}>
                                      ↓
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Colunas exibidas</p>
                          <Button type="button" size="sm" variant="outline" onClick={resetColumns}>
                            Reset colunas
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Tag</p>
                              <p className="text-xs text-muted-foreground">Coluna separada com [TAG].</p>
                            </div>
                            <Switch checked={showTag} onCheckedChange={setShowTag} />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Nome</p>
                            </div>
                            <Switch checked={showName} onCheckedChange={setShowName} />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Pontos</p>
                            </div>
                            <Switch checked={showPoints} onCheckedChange={setShowPoints} />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Kills</p>
                            </div>
                            <Switch checked={showKills} onCheckedChange={setShowKills} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Extras</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Partidas</p>
                            </div>
                            <Switch checked={matches} onCheckedChange={(v: boolean) => setMatches(v)} />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Vitórias</p>
                            </div>
                            <Switch checked={wins} onCheckedChange={(v: boolean) => setWins(v)} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Estilo visual</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="headerBg">Fundo do cabeçalho</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="headerBg"
                                type="color"
                                value={headerBg}
                                onChange={(e) => setHeaderBg(e.target.value)}
                                className="h-10 w-14 p-1"
                                aria-label="Fundo do cabeçalho"
                              />
                              <Input value={headerBg} onChange={(e) => setHeaderBg(e.target.value)} placeholder="#020617" />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="headerText">Texto do cabeçalho</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="headerText"
                                type="color"
                                value={headerText}
                                onChange={(e) => setHeaderText(e.target.value)}
                                className="h-10 w-14 p-1"
                                aria-label="Texto do cabeçalho"
                              />
                              <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="#e5e7eb" />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="rowBg">Fundo das linhas</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="rowBg"
                                type="color"
                                value={rowBg}
                                onChange={(e) => setRowBg(e.target.value)}
                                className="h-10 w-14 p-1"
                                aria-label="Fundo das linhas"
                              />
                              <Input value={rowBg} onChange={(e) => setRowBg(e.target.value)} placeholder="#020617" />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="rowAltBg">Fundo alternado</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="rowAltBg"
                                type="color"
                                value={rowAltBg}
                                onChange={(e) => setRowAltBg(e.target.value)}
                                className="h-10 w-14 p-1"
                                aria-label="Fundo alternado"
                              />
                              <Input value={rowAltBg} onChange={(e) => setRowAltBg(e.target.value)} placeholder="#0b1220" />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="rowBorderColor">Cor da borda</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="rowBorderColor"
                                type="color"
                                value={rowBorderColor}
                                onChange={(e) => setRowBorderColor(e.target.value)}
                                className="h-10 w-14 p-1"
                                aria-label="Cor da borda"
                              />
                              <Input
                                value={rowBorderColor}
                                onChange={(e) => setRowBorderColor(e.target.value)}
                                placeholder="#1f2933"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="rowBorderWidth">Espessura da borda (px)</Label>
                            <Input
                              id="rowBorderWidth"
                              type="number"
                              min={0}
                              max={8}
                              value={rowBorderWidth}
                              onChange={(e) => setRowBorderWidth(e.target.value)}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="cornerRadius">Raio dos cantos (px)</Label>
                            <Input
                              id="cornerRadius"
                              type="number"
                              min={0}
                              max={48}
                              value={cornerRadius}
                              onChange={(e) => setCornerRadius(e.target.value)}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="cellPaddingX">Padding horizontal (px)</Label>
                            <Input
                              id="cellPaddingX"
                              type="number"
                              min={0}
                              max={64}
                              value={cellPaddingX}
                              onChange={(e) => setCellPaddingX(e.target.value)}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="cellPaddingY">Padding vertical (px)</Label>
                            <Input
                              id="cellPaddingY"
                              type="number"
                              min={0}
                              max={32}
                              value={cellPaddingY}
                              onChange={(e) => setCellPaddingY(e.target.value)}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label>Densidade</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={density === "compact" ? "default" : "outline"}
                                onClick={() => setDensity("compact")}
                                className="flex-1"
                              >
                                Compacta
                              </Button>
                              <Button
                                type="button"
                                variant={density === "comfortable" ? "default" : "outline"}
                                onClick={() => setDensity("comfortable")}
                                className="flex-1"
                              >
                                Confortável
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                <p className="text-xs text-muted-foreground">Browser Source recomendado: 1920px de largura (altura varia conforme linhas).</p>
              </div>
            </TabsContent>

            <TabsContent value="mvp" className="mt-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-semibold">MVP destaque (atual)</p>
                  <div className="grid gap-2">
                    <Label htmlFor="quedaId">ID da Queda (opcional)</Label>
                    <Input id="quedaId" value={quedaId} onChange={(e) => setQuedaId(e.target.value)} placeholder="match_id" />
                    <p className="text-xs text-muted-foreground">Se vazio, pega o MVP geral do treino.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rodadaId">ID da Rodada (opcional)</Label>
                    <Input id="rodadaId" value={rodadaId} onChange={(e) => setRodadaId(e.target.value)} placeholder="round_id" />
                  </div>

                  <div className="grid gap-2">
                    <Label>Link (MVP destaque)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={mvpUrl} />
                      <Button type="button" variant="outline" onClick={() => openLink(mvpUrl)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => copyToClipboard(mvpUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Browser Source recomendado: 1920x300.</p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="text-sm font-semibold">MVP ranking (Top até 24) — clicável (overlay)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="mvpTop">Quantidade (1–24)</Label>
                      <Input id="mvpTop" value={mvpTop} onChange={(e) => setMvpTop(e.target.value)} placeholder="10" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Link (MVP ranking)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={mvpRankingUrl} />
                      <Button type="button" variant="outline" onClick={() => openLink(mvpRankingUrl)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => copyToClipboard(mvpRankingUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Browser Source recomendado: 1920x300.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
