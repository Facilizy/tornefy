import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileJson } from "lucide-react";
import type { AiExtractResult, SlotCreatePayload } from "./aiImportTypes";
import { ExternalTeamsImportStepper } from "./import-steps/ExternalTeamsImportStepper";
import { ExternalTeamsPromptStep } from "./import-steps/ExternalTeamsPromptStep";
import { ExternalTeamsPasteJsonStep } from "./import-steps/ExternalTeamsPasteJsonStep";
import { ExternalTeamsPreviewStep } from "./import-steps/ExternalTeamsPreviewStep";

function ensureSlots12(slots: Array<{ slot: number; jogadores: string[]; team_name?: string; team_tag?: string }>) {
  const by = new Map(slots.map((s) => [Number(s.slot), s]));
  const out: Array<{ slot: number; jogadores: string[]; team_name?: string; team_tag?: string }> = [];
  for (let i = 1; i <= 12; i++) {
    const s = by.get(i);
    out.push({ slot: i, jogadores: s?.jogadores ?? [], team_name: s?.team_name, team_tag: s?.team_tag });
  }
  return out;
}

function parseJsonLoose(text: string): any {
  const trimmed = (text ?? "").trim();
  if (!trimmed) throw new Error("Cole o JSON primeiro");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("JSON inválido");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function pickString(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k] ?? obj?.[String(k).toLowerCase()] ?? obj?.[String(k).toUpperCase()];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function inferTeamTagFromPlayers(players: string[]): string {
  const cleaned = (players ?? [])
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  if (!cleaned.length) return "";

  // Heuristic: use prefix before first space (e.g. "BN7 NUNE$7" -> "BN7")
  const prefixes = cleaned
    .map((p) => p.split(/\s+/)[0] ?? "")
    .map((x) =>
      x
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10)
    )
    .filter((x) => x.length >= 2);

  if (!prefixes.length) return "";

  const counts = new Map<string, number>();
  for (const p of prefixes) counts.set(p, (counts.get(p) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [best, bestCount] = sorted[0];
  if (best && bestCount >= 2) return best;

  // No majority: pick the clearest (shortest) prefix as fallback
  return prefixes.sort((a, b) => a.length - b.length)[0] ?? "";
}

function deriveTeamTagFromName(teamName: string, slot: number): string {
  const cleaned = (teamName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return `S${slot}`;

  // Prefer acronym from up to 3 words (e.g. "GALO ESPORTS" -> "GE")
  const words = cleaned.split(" ").filter(Boolean);
  const acronym = words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .slice(0, 6);
  if (acronym.length >= 2) return acronym;

  // Fallback: first 4 alnum chars
  const compact = cleaned.replace(/\s/g, "");
  return compact.slice(0, 4) || `S${slot}`;
}

export function ExternalTeamsJsonImportDialog({
  trainingId,
  onCreated,
}: {
  trainingId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [result, setResult] = useState<AiExtractResult | null>(null);
  const [teamMeta, setTeamMeta] = useState<Record<number, { team_name: string; team_tag: string }>>({});
  const [slotsState, setSlotsState] = useState(
    () => ensureSlots12([] as Array<{ slot: number; jogadores: string[]; team_name?: string; team_tag?: string }>)
  );

  const [dupOpen, setDupOpen] = useState(false);
  const [dupReport, setDupReport] = useState<any>(null);
  const [pendingSlots, setPendingSlots] = useState<SlotCreatePayload[] | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setCreating(false);
      setRawJson("");
      setResult(null);
      setTeamMeta({});
      setSlotsState(ensureSlots12([] as any));
      setDupOpen(false);
      setDupReport(null);
      setPendingSlots(null);
    }
  }, [open]);

  const slots = slotsState;
  const totalPlayers = useMemo(
    () => slots.reduce((acc, s) => acc + (s.jogadores?.length ?? 0), 0),
    [slots]
  );

  const handleLoad = () => {
    try {
      const obj = parseJsonLoose(rawJson);
      const extracted = obj as AiExtractResult;
      if (!Array.isArray((extracted as any)?.slots)) throw new Error("JSON sem campo 'slots'");

      const fixed: AiExtractResult = {
        total_jogadores: (extracted as any).total_jogadores,
        data_extracao: (extracted as any).data_extracao,
        slots: ensureSlots12(
          (extracted as any).slots.map((s: any) => ({
            slot: Number(s.slot),
            jogadores: Array.isArray(s.jogadores) ? s.jogadores.map((x: any) => String(x ?? "").trim()).filter(Boolean) : [],
            // Accept common key variants coming from external prompts
            team_name: pickString(s, ["team_name", "equipe_referencia", "equipe", "time", "nome", "name"]),
            team_tag: pickString(s, ["team_tag", "tag_referencia", "tag", "clan_tag", "sigla"]),
          }))
        ),
      };

      setResult(fixed);
      setSlotsState(ensureSlots12(fixed.slots ?? []));

      const nextMeta: Record<number, { team_name: string; team_tag: string }> = {};
      for (const s of fixed.slots) {
        const teamName = String((s as any).team_name ?? "").trim() || `SLOT ${s.slot}`;
        const explicitTag = String((s as any).team_tag ?? "").trim();
        const inferredFromPlayers = inferTeamTagFromPlayers((s as any).jogadores ?? []);
        nextMeta[s.slot] = {
          team_name: teamName,
          team_tag: (explicitTag || inferredFromPlayers || deriveTeamTagFromName(teamName, s.slot))
            .toUpperCase()
            .slice(0, 10),
        };
      }
      setTeamMeta(nextMeta);
      setStep(3);
      toast.success("JSON carregado. Revise nome/TAG e confirme.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao ler JSON");
    }
  };

  const invokeCreate = async (payloadSlots: SlotCreatePayload[], confirm: boolean) => {
    const { data, error } = await supabase.functions.invoke("external-teams-create", {
      body: { trainingId, slots: payloadSlots, confirm },
    });
    if (!error) return { data };

    const ctx = (error as any)?.context;
    const status = ctx?.status ?? ctx?.response?.status;
    const bodyCandidate = ctx?.body ?? ctx?.response?.body ?? ctx?.response?.data;

    // Supabase may return body as string, object, ArrayBuffer/Uint8Array.
    const decodeBodyToString = (b: any): string | null => {
      try {
        if (!b) return null;
        if (typeof b === "string") return b;
        if (typeof ArrayBuffer !== "undefined" && b instanceof ArrayBuffer) {
          return new TextDecoder().decode(new Uint8Array(b));
        }
        if (typeof Uint8Array !== "undefined" && b instanceof Uint8Array) return new TextDecoder().decode(b);
        return null;
      } catch {
        return null;
      }
    };

    const bodyText = decodeBodyToString(bodyCandidate);
    const parsedBody =
      bodyText != null
        ? (() => {
            try {
              return JSON.parse(bodyText);
            } catch {
              return bodyText;
            }
          })()
        : bodyCandidate;

    return { error, status, body: parsedBody };
  };

  const handleCreate = async (opts?: { confirm?: boolean }) => {
    if (!result) {
      toast.error("Carregue o JSON primeiro");
      return;
    }

    try {
      setCreating(true);
      const payloadSlots: SlotCreatePayload[] = slots.map((s) => ({
        slot: s.slot,
        team_name: teamMeta[s.slot]?.team_name?.trim() || `SLOT ${s.slot}`,
        team_tag: teamMeta[s.slot]?.team_tag?.trim() || `S${s.slot}`,
        jogadores: (s.jogadores ?? []).slice(0, 6),
      }));

       setPendingSlots(payloadSlots);

       const confirm = Boolean(opts?.confirm);
       const res = await invokeCreate(payloadSlots, confirm);

       if ((res as any)?.status === 409 && (res as any)?.body && typeof (res as any).body === "object") {
         const bodyObj = (res as any).body as any;
         if (String(bodyObj?.error ?? "") === "duplicates_detected") {
           setDupReport(bodyObj?.duplicates ?? null);
           setDupOpen(true);
           return;
         }
       }

        if ((res as any)?.error) {
          const status = (res as any)?.status;
          const body = (res as any)?.body;
          const msgFromBody =
            typeof body === "object" && body && "error" in body ? String((body as any).error) :
            typeof body === "string" && body ? body :
            undefined;
          if (String(msgFromBody) === "slot_conflict") {
            const conflicts = Array.isArray((body as any)?.extra?.conflicts)
              ? (body as any).extra.conflicts
              : [];
            const list = conflicts.length ? conflicts.join(", ") : "";
            throw new Error(
              `Slots ocupados: ${list || "verifique a tabela"}. Libere esses slots ou altere os slots no JSON.`
            );
          }

          const suffix = status ? ` (HTTP ${status})` : "";
          throw new Error(
            `${msgFromBody || (res as any).error.message || "Erro ao criar equipes"}${suffix}`
          );
        }

      const createdCount = (((res as any)?.data as any)?.created ?? []).length;
      toast.success(`${createdCount} equipe(s) externa(s) criada(s) e inscrita(s)!`);
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar equipes");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileJson className="h-4 w-4" />
          Importar (JSON)
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 right-[-120px] h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-24 left-[-140px] h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
          </div>

          <DialogHeader className="relative p-4 sm:p-5 border-b border-border bg-card/70 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Importação assistida</p>
                <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Importar Equipes Externas
                </DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você gera o JSON no Gemini e cola aqui para criarmos as equipes automaticamente.
                </p>
              </div>

              <ExternalTeamsImportStepper step={step} />
            </div>
          </DialogHeader>

          <div className="relative p-4 sm:p-5">
            {step === 1 ? (
              <ExternalTeamsPromptStep onNext={() => setStep(2)} />
            ) : step === 2 ? (
              <ExternalTeamsPasteJsonStep
                rawJson={rawJson}
                setRawJson={setRawJson}
                onLoad={handleLoad}
                onBack={() => setStep(1)}
              />
            ) : (
              <ExternalTeamsPreviewStep
                creating={creating}
                totalPlayers={totalPlayers}
                extractedAt={result?.data_extracao}
                slots={slots}
                setSlots={setSlotsState}
                teamMeta={teamMeta}
                setTeamMeta={setTeamMeta}
                onBack={() => setStep(2)}
                onCreate={handleCreate}
              />
            )}
          </div>
        </div>

        <Dialog open={dupOpen} onOpenChange={setDupOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Possíveis duplicidades detectadas</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Encontramos equipes externas já existentes com <span className="font-medium">TAG</span>,
                <span className="font-medium"> nome</span> ou <span className="font-medium">jogadores</span> iguais.
                Você quer continuar mesmo assim?
              </p>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">TAG</div>
                  <ul className="space-y-1">
                    {(dupReport?.tags ?? []).slice(0, 10).map((t: any, i: number) => (
                      <li key={`t-${i}`} className="rounded-md border border-border bg-card/50 px-2 py-1">
                        <span className="font-medium">{t?.tag ?? "—"}</span>
                        <span className="text-muted-foreground"> — {t?.name ?? ""}</span>
                      </li>
                    ))}
                    {!(dupReport?.tags ?? []).length ? <li className="text-muted-foreground">Nenhuma</li> : null}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Nome</div>
                  <ul className="space-y-1">
                    {(dupReport?.names ?? []).slice(0, 10).map((t: any, i: number) => (
                      <li key={`n-${i}`} className="rounded-md border border-border bg-card/50 px-2 py-1">
                        <span className="font-medium">{t?.name ?? "—"}</span>
                        <span className="text-muted-foreground"> — {t?.tag ?? ""}</span>
                      </li>
                    ))}
                    {!(dupReport?.names ?? []).length ? <li className="text-muted-foreground">Nenhuma</li> : null}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Jogadores</div>
                  <ul className="space-y-1">
                    {(dupReport?.players ?? []).slice(0, 10).map((p: any, i: number) => (
                      <li key={`p-${i}`} className="rounded-md border border-border bg-card/50 px-2 py-1">
                        <span className="font-medium">{p?.player_name ?? "—"}</span>
                        <span className="text-muted-foreground"> — {p?.tag ?? ""}</span>
                      </li>
                    ))}
                    {!(dupReport?.players ?? []).length ? <li className="text-muted-foreground">Nenhum</li> : null}
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDupOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  setDupOpen(false);
                  if (!pendingSlots) return;
                  await handleCreate({ confirm: true });
                }}
                disabled={!pendingSlots}
              >
                Continuar e criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
