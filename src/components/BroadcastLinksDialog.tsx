import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { Copy, ExternalLink, Radio } from "lucide-react";

const PUBLISHED_BASE_URL = "https://humble-canvas-init.lovable.app";

type PresetKey = "padrao" | "compacto" | "grande";

function buildUrl(base: string, path: string, params: Record<string, string>) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") url.searchParams.set(k, v);
  });
  return url.toString();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente.");
  }
}

type Props = {
  trainingId: string;
};

export function BroadcastLinksDialog({ trainingId }: Props) {
  const [open, setOpen] = useState(false);

  const [baseUrl, setBaseUrl] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.origin : PUBLISHED_BASE_URL
  );

  // Config rápida
  const [preset, setPreset] = useState<PresetKey>("padrao");

  // Config (valores reais que viram params)
  const [limit, setLimit] = useState<"8" | "12" | "16">("8");
  const [cols, setCols] = useState<"1" | "2">("2");
  const [logo, setLogo] = useState<boolean>(true);
  const [gap, setGap] = useState<string>("48");
  const [font, setFont] = useState<string>("18");
  const [fontColor, setFontColor] = useState<string>("#ffffff");

  // Avançado (opcional)
  const [matches, setMatches] = useState<boolean>(false);
  const [wins, setWins] = useState<boolean>(false);
  const [matchesCol, setMatchesCol] = useState<string>("");
  const [winsCol, setWinsCol] = useState<string>("");

  const [quedaId, setQuedaId] = useState<string>("");
  const [rodadaId, setRodadaId] = useState<string>("");

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

  const safeGap = String(Math.max(0, Number(gap || 0)));
  const safeFont = String(Math.max(12, Number(font || 12)));

  const baseParams = useMemo(
    () => ({
      treino_id: trainingId,
      cols,
      logo: logo ? "1" : "0",
      gap: safeGap,
      font: safeFont,
      font_color: fontColor,
      matches: matches ? "1" : "0",
      wins: wins ? "1" : "0",
      matches_col: matchesCol.trim(),
      wins_col: winsCol.trim(),
    }),
    [trainingId, cols, logo, safeGap, safeFont, fontColor, matches, wins, matchesCol, winsCol]
  );

  const tabelaUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/tabela-geral", {
      ...baseParams,
      limit,
    });
  }, [baseUrl, baseParams, limit]);

  const mvpUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/mvp", {
      ...baseParams,
      queda_id: quedaId.trim(),
      rodada_id: rodadaId.trim(),
    });
  }, [baseUrl, baseParams, quedaId, rodadaId]);

  const quedaUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/queda", {
      ...baseParams,
      queda_id: quedaId.trim(),
    });
  }, [baseUrl, baseParams, quedaId]);

  const rodadaUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/rodada", {
      ...baseParams,
      rodada_id: rodadaId.trim(),
    });
  }, [baseUrl, baseParams, rodadaId]);

  const openLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Radio className="h-4 w-4" />
          Links (OBS)
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Links para OBS</DialogTitle>
          <DialogDescription>
            Configure rápido e copie a URL pronta. (Se no OBS “não aparece nada”, use a URL <b>publicada</b>.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Base URL (o maior motivo de não funcionar no OBS) */}
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base (domínio)</Label>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://seu-dominio.com"
              />
              <Button type="button" variant="outline" onClick={() => setBaseUrl(PUBLISHED_BASE_URL)}>
                Usar publicada
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBaseUrl(typeof window !== "undefined" ? window.location.origin : PUBLISHED_BASE_URL)}
              >
                Usar atual
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              OBS geralmente falha com links de preview/editor. Prefira a base publicada (lovable.app) ou seu domínio.
            </p>
          </div>

          <Separator />

          {/* Configuração rápida */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Configuração rápida</p>
              <p className="text-xs text-muted-foreground">Escolha um preset e pronto.</p>
            </div>

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

          {/* Ajustes simples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
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
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Mostrar logos</p>
                  <p className="text-xs text-muted-foreground">logo=1/0</p>
                </div>
                <Switch checked={logo} onCheckedChange={(v: boolean) => setLogo(v)} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="gap">Espaço</Label>
                  <Input id="gap" value={gap} onChange={(e) => setGap(e.target.value)} placeholder="48" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="font">Tamanho da fonte</Label>
                  <Input id="font" value={font} onChange={(e) => setFont(e.target.value)} placeholder="18" />
                </div>
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
                    <Input
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Limite (tabela geral)</Label>
                <div className="flex gap-2">
                  {(["8", "12", "16"] as const).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={limit === v ? "default" : "outline"}
                      onClick={() => setLimit(v)}
                      className="flex-1"
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="quedaId">ID da Queda (opcional)</Label>
                <Input id="quedaId" value={quedaId} onChange={(e) => setQuedaId(e.target.value)} placeholder="UUID" />
                <p className="text-xs text-muted-foreground">Usa para filtrar Queda e também o MVP daquele recorte.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rodadaId">ID da Rodada (opcional)</Label>
                <Input id="rodadaId" value={rodadaId} onChange={(e) => setRodadaId(e.target.value)} placeholder="UUID" />
                <p className="text-xs text-muted-foreground">Usa para filtrar Rodada e também o MVP daquele recorte.</p>
              </div>

              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Avançado: partidas/vitórias</summary>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Partidas (matches)</p>
                      <p className="text-xs text-muted-foreground">matches=1 + matches_col</p>
                    </div>
                    <Switch checked={matches} onCheckedChange={(v: boolean) => setMatches(v)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="matchesCol">matches_col</Label>
                    <Input
                      id="matchesCol"
                      value={matchesCol}
                      onChange={(e) => setMatchesCol(e.target.value)}
                      placeholder="ex: partidas_jogadas"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Vitórias (wins)</p>
                      <p className="text-xs text-muted-foreground">wins=1 + wins_col</p>
                    </div>
                    <Switch checked={wins} onCheckedChange={(v: boolean) => setWins(v)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="winsCol">wins_col</Label>
                    <Input id="winsCol" value={winsCol} onChange={(e) => setWinsCol(e.target.value)} placeholder="ex: vitorias" />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Só funciona se os nomes das colunas existirem na view.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <Separator />

          {/* URLs prontas */}
          <div className="grid grid-cols-1 gap-3">
            <div className="grid gap-2">
              <Label>MVP (destaque)</Label>
              <div className="flex gap-2">
                <Input readOnly value={mvpUrl} />
                <Button type="button" variant="outline" onClick={() => openLink(mvpUrl)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => copyToClipboard(mvpUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Precisa só do treino. Queda/Rodada são opcionais.</p>
            </div>

            <div className="grid gap-2">
              <Label>Tabela Geral</Label>
              <div className="flex gap-2">
                <Input readOnly value={tabelaUrl} />
                <Button type="button" variant="outline" onClick={() => openLink(tabelaUrl)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" onClick={() => copyToClipboard(tabelaUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Queda</Label>
                <div className="flex gap-2">
                  <Input readOnly value={quedaUrl} />
                  <Button type="button" variant="outline" onClick={() => openLink(quedaUrl)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => copyToClipboard(quedaUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Precisa de treino_id + queda_id.</p>
              </div>

              <div className="grid gap-2">
                <Label>Rodada</Label>
                <div className="flex gap-2">
                  <Input readOnly value={rodadaUrl} />
                  <Button type="button" variant="outline" onClick={() => openLink(rodadaUrl)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => copyToClipboard(rodadaUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Precisa de treino_id + rodada_id.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Dica OBS: use “Browser Source” com largura 1920 e altura 300.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
