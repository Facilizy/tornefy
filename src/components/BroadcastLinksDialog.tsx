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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Radio } from "lucide-react";
import { copyToClipboard } from "@/components/broadcast-links/clipboard";
import { buildUrl, PresetKey } from "@/components/broadcast-links/url";

type Props = {
  trainingId: string;
};

export function BroadcastLinksDialog({ trainingId }: Props) {
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
  const [header, setHeader] = useState<boolean>(true);

  // Colunas extras
  const [matches, setMatches] = useState<boolean>(false);
  const [wins, setWins] = useState<boolean>(false);

  const [quedaId, setQuedaId] = useState<string>("");
  const [rodadaId, setRodadaId] = useState<string>("");

  // MVP ranking (Top N)
  const [mvpTop, setMvpTop] = useState<string>("10");

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
  const safeLimit = String(Math.max(1, Math.min(24, Number(limit || 8))));
  const safeMvpTop = String(Math.max(1, Math.min(24, Number(mvpTop || 10))));

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
    }),
    [trainingId, cols, logo, header, safeGap, safeFont, fontColor, firstColor, matches, wins]
  );

  const tabelaUrl = useMemo(() => {
    return buildUrl(baseUrl, "/overlays/tabela-geral", {
      ...baseParams,
      limit: safeLimit,
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
        <Button variant="outline" className="w-full justify-start gap-2">
          <Radio className="h-4 w-4" />
          Links (OBS)
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[760px]">
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
                    <div className="grid gap-2">
                      <Label htmlFor="fontColor">Cor</Label>
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
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="firstColor">Cor do 1º lugar</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="firstColor"
                        type="color"
                        value={firstColor}
                        onChange={(e) => setFirstColor(e.target.value)}
                        className="h-10 w-14 p-1"
                        aria-label="Cor do primeiro lugar"
                      />
                      <Input value={firstColor} onChange={(e) => setFirstColor(e.target.value)} placeholder="#a855f7" />
                    </div>
                    <p className="text-xs text-muted-foreground">Aplicado na equipe em 1º lugar.</p>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Linhas (equipes)</p>
                    <p className="text-xs text-muted-foreground">De 1 até 24 equipes.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="limit">Quantidade (1–24)</Label>
                    <Input id="limit" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="8" />
                  </div>

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

                  <div className="grid gap-2">
                    <Label>Link (Tabela geral)</Label>
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
