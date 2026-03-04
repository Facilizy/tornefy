import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { AlertCircle, Camera, FileImage, Info, Loader2, Upload, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UnresolvedPlayersPanel } from "./UnresolvedPlayersPanel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { LinkTagInlinePanel } from "@/components/score-management/LinkTagInlinePanel";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file_read_error"));
    reader.onload = () => {
      const res = String(reader.result ?? "");
      const idx = res.indexOf(",");
      if (idx === -1) return reject(new Error("invalid_data_url"));
      resolve(res.slice(idx + 1));
    };
    reader.readAsDataURL(file);
  });
}

type Preview = {
  warnings: string[];
  unresolved_players: any[];
  resolved: Array<{
    posicao: number;
    dominant_tag: string;
    resolution?: "registered_tag" | "round_link" | "unmatched";
    team: { id: string; tag: string; name: string | null } | null;
    jogadores: Array<{ nick_normalizado: string; abates: number }>;
  }>;
  preview_inserts: {
    match_scores: Array<{ team_id: string; position: number; kills: number; position_points: number; kill_points: number; total_points: number }>;
  };
};

export function ProcessScoreboardDialog({
  trainingId,
  matchId,
  onApplied,
}: {
  trainingId: string;
  matchId: string;
  onApplied?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [linkingTag, setLinkingTag] = useState<string>("");
  const [roundId, setRoundId] = useState<string>("");
  const [trainingGame, setTrainingGame] = useState<string>("");
  const [maxSlots, setMaxSlots] = useState<number | null>(null);

  const maxPrintsForGame = useMemo(() => {
    const g = String(trainingGame || "").toLowerCase();
    if (g === "free_fire") return 2;
    if (g === "blood_strike") return 4;
    if (g === "pubg_mobile") return 4;
    return 2;
  }, [trainingGame]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const [matchRes, trainingRes] = await Promise.all([
          supabase.from("training_matches").select("round_id").eq("id", matchId).maybeSingle(),
          supabase.from("trainings").select("game, max_slots").eq("id", trainingId).maybeSingle(),
        ]);

        if (!mounted) return;

        if (matchRes.error) throw matchRes.error;
        setRoundId(String((matchRes.data as any)?.round_id ?? ""));

        if (trainingRes.error) throw trainingRes.error;
        setTrainingGame(String((trainingRes.data as any)?.game ?? ""));
        const ms = (trainingRes.data as any)?.max_slots;
        setMaxSlots(typeof ms === "number" && Number.isFinite(ms) ? ms : null);
      } catch (e: any) {
        console.warn("Falha ao carregar dados do treino/queda", e);
        setRoundId("");
        setTrainingGame("");
        setMaxSlots(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, matchId, trainingId]);

  useEffect(() => {
    // revoke old URLs
    for (const u of imageUrls) URL.revokeObjectURL(u);

    if (files.length === 0) {
      setImageUrls([]);
      setZoom(1);
      return;
    }

    const urls = files.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    setZoom(1);

    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const hasWarnings = useMemo(() => (preview?.warnings?.length ?? 0) > 0, [preview]);
  const unresolvedCount = useMemo(() => preview?.unresolved_players?.length ?? 0, [preview]);

  type Severity = "info" | "warn" | "error";
  type PrettyWarning = { severity: Severity; title: string; detail?: string; raw: string; tag?: string };

  const parseWarning = (raw: string): PrettyWarning => {
    const s = String(raw ?? "").trim();

    // Backend-specific known patterns
    if (s.startsWith("unmatched_team_tag_")) {
      const tag = s.replace("unmatched_team_tag_", "").trim();
      return {
        severity: "warn",
        title: `TAG não encontrada no treino: ${tag || "(sem TAG)"}`,
        detail: "Vincule essa TAG a uma equipe confirmada e gere a prévia novamente.",
        raw: s,
        tag: tag || undefined,
      };
    }

    // Heurística de severidade
    const lower = s.toLowerCase();
    const severity: Severity = /error|failed|exception|invalid|denied|forbidden|unauthorized/.test(lower)
      ? "error"
      : /missing|not_found|not found|unmatched|incomplete|ambiguous|timeout|rate/.test(lower)
        ? "warn"
        : "info";

    // “Humanização” sem códigos
    const cleaned = s
      .replace(/_/g, " ")
      .replace(/\bprocess score\b/gi, "processamento")
      .replace(/\bscoreboard\b/gi, "placar")
      .replace(/\bocr\b/gi, "leitura")
      .replace(/\s+/g, " ")
      .trim();

    const title = cleaned
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : "Aviso";

    return { severity, title, raw: s };
  };

  const warningGroups = useMemo(() => {
    const warnings = Array.isArray(preview?.warnings) ? preview!.warnings : [];
    const parsed = warnings
      .map((w) => parseWarning(String(w ?? "")))
      .filter((w) => w.title.trim().length > 0);

    return {
      total: parsed.length,
      info: parsed.filter((w) => w.severity === "info"),
      warn: parsed.filter((w) => w.severity === "warn"),
      error: parsed.filter((w) => w.severity === "error"),
      unmatchedTags: parsed.filter((w) => w.tag).map((w) => w.tag!) as string[],
    };
  }, [preview]);

  const goManual = () => {
    setOpen(false);
    // allow dialog close animation to finish before scroll
    window.setTimeout(() => {
      document.getElementById("score-entry-manual")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const run = async (dry_run: boolean) => {
    if (files.length === 0) {
      toast.error("Selecione pelo menos 1 imagem");
      return;
    }

    if (files.length > maxPrintsForGame) {
      toast.error(`Máximo de ${maxPrintsForGame} prints para este jogo.`);
      return;
    }

    const maxBytes = 6 * 1024 * 1024;
    const tooLarge = files.find((f) => f.size > maxBytes);
    if (tooLarge) {
      toast.error(`Imagem muito grande: ${tooLarge.name} (máx. 6MB).`);
      return;
    }

    if (dry_run) setProcessing(true);
    else setApplying(true);

    try {
      setError(null);
      const image_base64s = await Promise.all(files.map((f) => fileToBase64(f)));
      const mime_types = files.map((f) => f.type || "image/png");

      const { data, error: fnErr } = await supabase.functions.invoke("process-scoreboard", {
        body: {
          training_id: trainingId,
          match_id: matchId,
          image_base64s,
          mime_types,
          dry_run,
          // opcional: backend usa isso como override do max_slots quando fizer sentido
          expected_team_count: maxSlots,
        },
      });

      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "process_scoreboard_failed");

      if (dry_run) {
        setPreview(data as Preview);
      } else {
        toast.success("Placar processado e aplicado");
        onApplied?.();
        setOpen(false);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ? String(e.message) : "Falha ao processar");
    } finally {
      setProcessing(false);
      setApplying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setFiles([]);
          setImageUrls([]);
          setZoom(1);
          setPreview(null);
          setError(null);
          setProcessing(false);
          setApplying(false);
          setLinkingTag("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-2">
          <Camera className="h-4 w-4" />
          Auto‑Placar (Beta)
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-[calc(100vw-1rem)] sm:max-w-6xl h-[85vh] overflow-hidden p-0"
        // O Auto‑Placar abre outros overlays (Dialog/Select) em portal.
        // Para evitar que o Dialog principal interprete isso como "clique fora" e feche
        // (resetando estado e voltando para o início), bloqueamos o fechamento por outside.
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">Auto‑Placar (Beta)</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Envie os prints finais, gere a prévia, resolva avisos/vínculos e aplique.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="secondary" className="text-[11px]">Até {maxPrintsForGame} imagens</Badge>
              <Badge variant="secondary" className="text-[11px]">Máx. 6MB</Badge>
              {preview ? (
                <Badge variant="secondary" className="text-[11px]">
                  {hasWarnings || unresolvedCount > 0 ? "Requer revisão" : "Pronto"}
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(85vh-73px)] bg-card/10">
          {!preview ? (
            <ScrollArea className="flex-1 px-4 sm:px-6 py-8">
              <div className="max-w-2xl mx-auto space-y-8 mt-4 sm:mt-10">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Envio de Prints</h3>
                  <p className="text-muted-foreground"> Selecione até {maxPrintsForGame} imagens do resultado da partida para leitura automática via IA.</p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro na leitura</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <label
                    htmlFor="process-scoreboard-file"
                    className="group flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border/60 bg-background/50 p-10 transition-all hover:bg-muted/50 hover:border-primary/50 cursor-pointer"
                  >
                    <div className="rounded-full bg-card p-4 shadow-sm border border-border group-hover:scale-105 transition-transform">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium">
                        {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Clique aqui para selecionar os prints"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {files.length > 0
                          ? files.map((f) => f.name).join(" • ")
                          : "Recorte bem apenas a tabela central de resultados."}
                      </p>
                    </div>
                  </label>
                  <input
                    id="process-scoreboard-file"
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const next = Array.from(e.target.files ?? []);
                      setFiles(next);
                      setError(null);
                    }}
                  />

                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {imageUrls.map((src, i) => (
                        <div key={src} className="relative aspect-video rounded-lg border border-border bg-background/20 overflow-hidden group">
                          <img src={src} alt={`Print ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-xs text-white font-medium">Print {i + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => run(true)}
                    disabled={processing || files.length === 0}
                    className="w-full sm:flex-1 h-12 text-base gap-2"
                  >
                    {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    Fazer Leitura das Imagens
                  </Button>
                  <Button type="button" variant="outline" onClick={goManual} className="w-full sm:w-auto h-12 gap-2">
                    Preencher Manualmente
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-none p-4 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-4">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={applying} className="gap-2">
                  <XCircle className="w-4 h-4" /> Descartar e Voltar
                </Button>

                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={goManual} className="gap-2 shadow-sm" size="sm">
                    Ajustar Manualmente
                  </Button>
                  <Button
                    type="button"
                    onClick={() => run(false)}
                    disabled={applying || processing}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
                    Confirmar e Salvar Placar
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {linkingTag ? (
                    <LinkTagInlinePanel
                      trainingId={trainingId}
                      roundId={roundId}
                      tag={linkingTag}
                      onClose={() => setLinkingTag("")}
                      onLinked={() => setPreview(null)}
                    />
                  ) : null}

                  {(hasWarnings || unresolvedCount > 0) && (
                    <Alert variant="destructive" className="bg-destructive/5 text-destructive border-destructive/20">
                      <AlertTitle>Atenção necessária antes de salvar</AlertTitle>
                      <AlertDescription>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {unresolvedCount > 0 && <Badge variant="destructive" className="text-[11px]">Equipes não vinculadas: {unresolvedCount}</Badge>}
                          {warningGroups.error.length > 0 && <Badge variant="destructive" className="text-[11px]">Erros: {warningGroups.error.length}</Badge>}
                        </div>

                        {warningGroups.unmatchedTags.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium">Toque numa TAG abaixo para vinculá-la a uma de suas equipes:</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {warningGroups.unmatchedTags.slice(0, 24).map((tag, i) => (
                                <Button
                                  key={`${tag}:${i}`}
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 rounded-full px-4 border border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => setLinkingTag(tag)}
                                >
                                  {tag}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <Accordion type="multiple" className="w-full">
                            {warningGroups.error.length > 0 && (
                              <AccordionItem value="sev-error">
                                <AccordionTrigger>Erros de Leitura ({warningGroups.error.length})</AccordionTrigger>
                                <AccordionContent>
                                  <ul className="space-y-2 text-sm text-foreground">
                                    {warningGroups.error.map((w, i) => (
                                      <li key={`err:${i}`} className="p-2 border border-border rounded-md bg-background/30">
                                        <p className="font-medium text-destructive">{w.title}</p>
                                        {w.detail && <p className="text-xs text-muted-foreground mt-1">{w.detail}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                </AccordionContent>
                              </AccordionItem>
                            )}
                          </Accordion>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <UnresolvedPlayersPanel unresolved={preview.unresolved_players ?? []} onGoManual={goManual} />

                  <Separator />

                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">Posições Encontradas</h4>
                        <p className="text-xs text-muted-foreground">Confira os pontos, kills e posições antes de confirmar.</p>
                      </div>
                      <Badge variant="outline">{preview.resolved?.length ?? 0} equipes</Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      {preview.resolved?.map((r, idx) => {
                        const score = preview.preview_inserts?.match_scores?.find((s) => s.team_id === r.team?.id);
                        const isMissingTeam = !r.team;
                        return (
                          <div
                            key={`${r.posicao}:${r.dominant_tag}:${idx}`}
                            className={`flex flex-col gap-4 p-5 rounded-2xl border-2 transition-all duration-200 shadow-sm ${isMissingTeam
                              ? 'border-destructive/30 bg-destructive/5'
                              : 'border-border bg-card/40 hover:bg-muted/10 hover:border-primary/20'
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 font-black text-2xl shrink-0 ${isMissingTeam ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/5 text-primary'
                                  }`}>
                                  {r.posicao}º
                                </div>
                                <div className="min-w-0">
                                  {isMissingTeam ? (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-destructive uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                                        <AlertCircle className="w-3 h-3" /> Pendente de Vínculo
                                      </p>
                                      <p className="font-bold text-lg leading-none truncate text-muted-foreground/60 italic">
                                        TAG "{r.dominant_tag || "???"}" Desconhecida
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 tracking-widest">
                                        Equipe Identificada
                                      </p>
                                      <p className="font-black text-xl leading-none text-foreground truncate">
                                        [{r.team.tag}] {r.team.name ?? ""}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                {score && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-black text-lg shadow-md border border-primary/20">
                                    <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">TOTAL</span>
                                    {score.total_points}
                                  </div>
                                )}
                                {isMissingTeam ? (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="h-9 px-4 font-black text-[10px] uppercase tracking-wider shadow-sm hover:scale-105 transition-transform"
                                    onClick={() => setLinkingTag(String(r.dominant_tag || ""))}
                                  >
                                    Resolver Agora
                                  </Button>
                                ) : r.resolution === "round_link" && (
                                  <Badge variant="outline" className="text-[9px] uppercase font-black py-0.5 bg-background/50 border-primary/20 text-primary">
                                    Vínculo Manual
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {score && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-background/60 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Abates</span>
                                  <span className="text-xl font-black text-primary leading-none">{score.kills}</span>
                                </div>
                                <div className="bg-background/60 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Pts Abate</span>
                                  <span className="text-xl font-black text-foreground/80 leading-none">{score.kill_points}</span>
                                </div>
                                <div className="hidden sm:flex bg-background/60 border border-border/40 rounded-xl p-3 flex-col items-center justify-center text-center shadow-inner">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">Pts Pos.</span>
                                  <span className="text-xl font-black text-foreground/80 leading-none">{score.position_points}</span>
                                </div>
                              </div>
                            )}

                            {(r.jogadores?.length > 0) && (
                              <div className="w-full pt-4 mt-1 border-t border-dashed border-border/60">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-[10px] font-black tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> Performance dos Jogadores
                                  </p>
                                  <Badge variant="secondary" className="text-[9px] font-bold py-0 h-4 bg-muted/40">
                                    {r.jogadores.length} Players
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                  {r.jogadores.map((p, pIdx) => (
                                    <div key={pIdx} className="group bg-muted/20 hover:bg-primary/5 border border-border/40 hover:border-primary/20 rounded-xl p-3 flex items-center justify-between transition-all duration-200">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-background border border-border/60 flex items-center justify-center text-xs font-black text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                                          {pIdx + 1}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-xs truncate text-foreground/90 group-hover:text-foreground">
                                            {p.nick_normalizado || "???"}
                                          </p>
                                          <p className="text-[9px] text-muted-foreground font-medium">Jogador Encontrado</p>
                                        </div>
                                      </div>
                                      <div className="shrink-0 flex items-center gap-1.5 bg-background px-2.5 py-1.5 rounded-lg border border-border/60 shadow-sm group-hover:border-primary/20 transition-all">
                                        <span className="text-lg font-black text-primary leading-none">{p.abates}</span>
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase group-hover:text-primary/60">K</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
