import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

type SlotRow = { slot: number; jogadores: string[]; team_name?: string; team_tag?: string };

export function ExternalTeamsPreviewStep({
  creating,
  totalPlayers,
  extractedAt,
  slots,
  setSlots,
  teamMeta,
  setTeamMeta,
  onBack,
  onCreate,
}: {
  creating: boolean;
  totalPlayers: number;
  extractedAt?: string;
  slots: SlotRow[];
  setSlots: Dispatch<SetStateAction<SlotRow[]>>;
  teamMeta: Record<number, { team_name: string; team_tag: string }>;
  setTeamMeta: Dispatch<SetStateAction<Record<number, { team_name: string; team_tag: string }>>>;
  onBack: () => void;
  onCreate: () => void | Promise<void>;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveState, setMoveState] = useState<null | { fromSlot: number; index: number; name: string }>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  const moveTargets = useMemo(() => {
    const from = moveState?.fromSlot;
    return Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => n !== from);
  }, [moveState]);

  const openMove = (fromSlot: number, index: number, name: string) => {
    setMoveState({ fromSlot, index, name });
    setMoveTo("");
    setMoveOpen(true);
  };

  const confirmMove = () => {
    if (!moveState) return;
    const toSlot = Number(moveTo);
    if (!Number.isFinite(toSlot) || toSlot < 1 || toSlot > 12) return;

    setSlots((prev) => {
      const next = prev.map((s) => ({ ...s, jogadores: [...(s.jogadores ?? [])] }));
      const from = next.find((s) => s.slot === moveState.fromSlot);
      const to = next.find((s) => s.slot === toSlot);
      if (!from || !to) return prev;

      const [removed] = from.jogadores.splice(moveState.index, 1);
      if (!removed) return prev;
      // Avoid duplicates in destination
      if (!to.jogadores.includes(removed)) to.jogadores.push(removed);
      return next;
    });

    setMoveOpen(false);
    setMoveState(null);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tight">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Revisão — Nome e TAG por slot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Slots: 12</Badge>
            <Badge variant="secondary">Jogadores: {totalPlayers}</Badge>
            {extractedAt ? <Badge variant="outline">{extractedAt}</Badge> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_420px]">
            <div className="rounded-lg border border-border bg-background/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                Ajuste o <span className="font-medium">nome</span> e a <span className="font-medium">TAG</span>.
                Se quiser, você pode definir uma TAG padrão e editar slot a slot.
              </p>
            </div>

            <div className="space-y-2">
              <Label>TAG padrão (opcional)</Label>
              <Input
                placeholder="Ex: G1"
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().slice(0, 10);
                  setTeamMeta((prev) => {
                    const next: typeof prev = { ...prev };
                    for (let i = 1; i <= 12; i++) {
                      next[i] = {
                        ...(next[i] ?? { team_name: `SLOT ${i}`, team_tag: `S${i}` }),
                        team_tag: v || next[i]?.team_tag,
                      };
                    }
                    return next;
                  });
                }}
              />
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-3">
              {slots.map((s) => (
                <div key={s.slot} className="rounded-xl border border-border bg-card/50 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Slot {s.slot}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.jogadores.length} jogador(es)</div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 md:w-[520px]">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome da equipe</Label>
                        <Input
                          value={teamMeta[s.slot]?.team_name ?? `SLOT ${s.slot}`}
                          onChange={(e) =>
                            setTeamMeta((prev) => ({
                              ...prev,
                              [s.slot]: {
                                ...(prev[s.slot] ?? { team_name: "", team_tag: "" }),
                                team_name: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">TAG</Label>
                        <Input
                          value={teamMeta[s.slot]?.team_tag ?? `S${s.slot}`}
                          maxLength={10}
                          onChange={(e) =>
                            setTeamMeta((prev) => ({
                              ...prev,
                              [s.slot]: {
                                ...(prev[s.slot] ?? { team_name: "", team_tag: "" }),
                                team_tag: e.target.value.toUpperCase(),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(s.jogadores.length ? s.jogadores : ["—"]).map((name, idx) => (
                      <div
                        key={`${s.slot}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/30 px-3 py-2 text-sm"
                        title={name}
                      >
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        {name !== "—" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openMove(s.slot, idx, name)}
                          >
                            Mover
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={onBack} disabled={creating} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={onCreate} disabled={creating} className="sm:min-w-[220px]">
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar e Inscrever"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover jogador</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card/50 px-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground">Jogador</div>
              <div className="font-medium break-words">{moveState?.name ?? ""}</div>
              <div className="mt-1 text-xs text-muted-foreground">Origem: Slot {moveState?.fromSlot ?? "—"}</div>
            </div>

            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={moveTo} onValueChange={setMoveTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o slot" />
                </SelectTrigger>
                <SelectContent>
                  {moveTargets.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Slot {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmMove} disabled={!moveTo}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
