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
import { AlertCircle, Camera, FileImage, Info, Loader2, Upload, XCircle } from "lucide-react";
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(85vh-73px)]">
          {/* Coluna esquerda: upload + ações */}
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-4">
              {error && (
                <Alert>
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="process-scoreboard-file">Imagens</Label>
                  {files.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      onClick={() => {
                        setFiles([]);
                        setPreview(null);
                        setError(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Limpar
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border bg-card/30 p-3">
                  <label
                    htmlFor="process-scoreboard-file"
                    className="group flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background/20 p-3 transition-colors hover:bg-background/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-md border border-border bg-card p-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {files.length > 0 ? `${files.length} arquivo(s)` : "Selecionar prints"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {files.length > 0
                            ? files.map((f) => f.name).join(" • ")
                            : "Dica: recorte só a tabela do resultado"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground group-hover:text-foreground">
                      <FileImage className="inline h-4 w-4 mr-1 align-[-2px]" />
                      Selecionar
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
                      setPreview(null);
                      setError(null);
                    }}
                  />

                  {imageUrls.length > 0 ? (
                    <div className="mt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Pré‑visualização</p>
                          <p className="text-sm font-medium">{imageUrls.length} imagem(ns)</p>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline">Ampliar</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Imagens enviadas</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-3">
                              <div className="rounded-lg border border-border bg-card/40 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-medium">Zoom</p>
                                  <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                                </div>
                                <div className="mt-2">
                                  <Slider
                                    value={[zoom]}
                                    min={0.5}
                                    max={2}
                                    step={0.05}
                                    onValueChange={(v) => setZoom(v?.[0] ?? 1)}
                                  />
                                </div>
                              </div>

                              <div className="rounded-lg border border-border bg-background/20 overflow-auto max-h-[70vh]">
                                <div className="p-4 space-y-6">
                                  {imageUrls.map((src, idx) => (
                                    <div key={src} className="space-y-2">
                                      <div className="text-xs text-muted-foreground">Print {idx + 1}</div>
                                      <img
                                        src={src}
                                        alt={`Print ${idx + 1} enviado para o Auto‑Placar`}
                                        className="max-w-full h-auto origin-top-left"
                                        style={{ transform: `scale(${zoom})` }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {imageUrls.map((src) => (
                          <div key={src} className="rounded-md border border-border bg-background/20 overflow-hidden">
                            <img
                              src={src}
                              alt="Miniatura do print enviado"
                              className="h-20 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => run(true)}
                  disabled={processing || applying || files.length === 0}
                  className="gap-2"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Gerar prévia
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => run(false)}
                  disabled={processing || applying || !preview}
                  className="gap-2"
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Aplicar
                </Button>
                <Button type="button" variant="ghost" onClick={goManual} className="gap-2">
                  Ir para manual
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Se algo vier errado, use os avisos à direita para vincular TAGs e gerar a prévia novamente.
              </div>
            </div>
          </ScrollArea>

          {/* Coluna direita: preview + vínculos */}
          <ScrollArea className="h-full border-t lg:border-t-0 lg:border-l border-border">
            <div className="p-4 sm:p-6 space-y-4">
              {linkingTag ? (
                <LinkTagInlinePanel
                  trainingId={trainingId}
                  roundId={roundId}
                  tag={linkingTag}
                  onClose={() => setLinkingTag("")}
                  onLinked={() => {
                    // Mantém a imagem selecionada; apenas limpa a prévia para o usuário gerar novamente
                    setPreview(null);
                  }}
                />
              ) : null}

              {!preview ? (
                <div className="rounded-lg border border-border bg-card/20 p-4">
                  <p className="text-sm font-medium">Sem prévia ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Envie as imagens e clique em <span className="font-medium">Gerar prévia</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(hasWarnings || unresolvedCount > 0) && (
                    <Alert>
                      <AlertTitle>Avisos</AlertTitle>
                      <AlertDescription>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasWarnings ? (
                            <Badge variant="secondary" className="text-[11px]">Total: {warningGroups.total}</Badge>
                          ) : null}
                          {warningGroups.error.length > 0 ? (
                            <Badge variant="secondary" className="text-[11px]">Erros: {warningGroups.error.length}</Badge>
                          ) : null}
                          {warningGroups.warn.length > 0 ? (
                            <Badge variant="secondary" className="text-[11px]">Atenções: {warningGroups.warn.length}</Badge>
                          ) : null}
                          {unresolvedCount > 0 ? (
                            <Badge variant="secondary" className="text-[11px]">Não vinculados: {unresolvedCount}</Badge>
                          ) : null}
                        </div>

                        {warningGroups.unmatchedTags.length > 0 ? (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground">Toque numa TAG para vincular:</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {warningGroups.unmatchedTags.slice(0, 24).map((tag, i) => (
                                <Button
                                  key={`${tag}:${i}`}
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 rounded-full px-3 text-[11px]"
                                  onClick={() => setLinkingTag(tag)}
                                >
                                  {tag}
                                </Button>
                              ))}
                              {warningGroups.unmatchedTags.length > 24 ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  +{warningGroups.unmatchedTags.length - 24}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {hasWarnings && (
                          <div className="mt-3">
                            <Accordion type="multiple" className="w-full">
                              {warningGroups.error.length > 0 ? (
                                <AccordionItem value="sev-error">
                                  <AccordionTrigger>
                                    <span className="inline-flex items-center gap-2">
                                      <XCircle className="h-4 w-4" />
                                      Erros ({warningGroups.error.length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2 text-sm">
                                      {warningGroups.error.slice(0, 10).map((w, i) => (
                                        <li key={`${w.raw}:${i}`} className="rounded-md border border-border bg-background/20 p-2">
                                          <p className="font-medium">{w.title}</p>
                                          {w.detail ? (
                                            <p className="text-xs text-muted-foreground mt-0.5">{w.detail}</p>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              ) : null}

                              {warningGroups.warn.length > 0 ? (
                                <AccordionItem value="sev-warn">
                                  <AccordionTrigger>
                                    <span className="inline-flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4" />
                                      Atenções ({warningGroups.warn.length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2 text-sm">
                                      {warningGroups.warn
                                        .filter((w) => !w.tag)
                                        .slice(0, 10)
                                        .map((w, i) => (
                                          <li key={`${w.raw}:${i}`} className="rounded-md border border-border bg-background/20 p-2">
                                            <p className="font-medium">{w.title}</p>
                                            {w.detail ? (
                                              <p className="text-xs text-muted-foreground mt-0.5">{w.detail}</p>
                                            ) : null}
                                          </li>
                                        ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              ) : null}

                              {warningGroups.info.length > 0 ? (
                                <AccordionItem value="sev-info">
                                  <AccordionTrigger>
                                    <span className="inline-flex items-center gap-2">
                                      <Info className="h-4 w-4" />
                                      Info ({warningGroups.info.length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-2 text-sm">
                                      {warningGroups.info.slice(0, 10).map((w, i) => (
                                        <li key={`${w.raw}:${i}`} className="rounded-md border border-border bg-background/20 p-2">
                                          <p className="font-medium">{w.title}</p>
                                          {w.detail ? (
                                            <p className="text-xs text-muted-foreground mt-0.5">{w.detail}</p>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              ) : null}
                            </Accordion>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <UnresolvedPlayersPanel unresolved={preview.unresolved_players ?? []} onGoManual={goManual} />

                  <Separator />

                  <div className="rounded-lg border border-border bg-card/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Prévia do placar</p>
                      <p className="text-xs text-muted-foreground">{preview.resolved?.length ?? 0} equipes</p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {preview.resolved?.map((r, idx) => {
                        const score = preview.preview_inserts?.match_scores?.find((s) => s.team_id === r.team?.id);
                        const isMissingTeam = !r.team;
                        return (
                          <div
                            key={`${r.posicao}:${r.dominant_tag}:${idx}`}
                            className={
                              isMissingTeam
                                ? "rounded-md border border-destructive/50 bg-destructive/10 p-3"
                                : "rounded-md border border-border bg-background/20 p-3"
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {r.posicao}º —{" "}
                                  {r.team ? `[${r.team.tag}] ${r.team.name ?? ""}` : `TAG não vinculada: ${r.dominant_tag || "—"}`}
                                </p>
                                {score ? (
                                  <p className="text-[11px] text-muted-foreground">
                                    K {score.kills} • PP {score.position_points} • KP {score.kill_points} • T {score.total_points}
                                  </p>
                                ) : null}
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {!isMissingTeam && r.resolution === "round_link" ? (
                                  <Badge variant="secondary" className="text-[11px]">vínculo</Badge>
                                ) : null}
                                {isMissingTeam ? (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 rounded-full px-3 text-[11px]"
                                    onClick={() => setLinkingTag(String(r.dominant_tag || ""))}
                                  >
                                    Vincular
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                              {(r.jogadores ?? []).map((p, pIdx) => (
                                <p key={`${p.nick_normalizado}:${pIdx}`} className="text-[11px] text-muted-foreground">
                                  {p.nick_normalizado || "(vazio)"}: <span className="text-foreground">{p.abates}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
