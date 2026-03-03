import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shuffle, Users } from "lucide-react";
import { ScrimGroupsManager, type ScrimRegistrationRow } from "@/components/scrims/ScrimGroupsManager";
import { ActionTile } from "@/components/ActionTile";

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ScrimGroupsDialog({
  trainingId,
  canManage,
  enabled,
  registrations,
  onUpdated,
  triggerVariant = "button",
}: {
  trainingId: string;
  canManage: boolean;
  enabled: boolean;
  registrations: ScrimRegistrationRow[];
  onUpdated: () => void;
  triggerVariant?: "button" | "tile";
}) {
  const [open, setOpen] = useState(false);
  const [savingEnabled, setSavingEnabled] = useState(false);

  const [confirmShuffleOpen, setConfirmShuffleOpen] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  const confirmedTeams = useMemo(() => {
    return registrations
      .map((r) => String(r.team_id))
      .filter(Boolean);
  }, [registrations]);

  const persistEnabled = async (next: boolean) => {
    if (!canManage) return;
    try {
      setSavingEnabled(true);
      const { error } = await supabase
        .from("trainings")
        .update({ use_groups: next })
        .eq("id", trainingId);
      if (error) throw error;
      onUpdated();
      toast.success(next ? "Grupos ativados!" : "Grupos desativados!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar configuração de grupos");
    } finally {
      setSavingEnabled(false);
    }
  };

  const handleShuffle = async () => {
    if (!canManage) return;
    try {
      setShuffling(true);

      const gRes = await supabase
        .from("scrim_groups")
        .select("id, sort_order, created_at")
        .eq("training_id", trainingId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (gRes.error) throw gRes.error;
      const groups = (gRes.data || []) as { id: string }[];
      if (groups.length === 0) {
        toast.error("Crie pelo menos 1 grupo antes de sortear.");
        return;
      }
      if (confirmedTeams.length === 0) {
        toast.error("Não há equipes inscritas para sortear.");
        return;
      }

      const groupIds = groups.map((g) => String(g.id));
      const teamIds = shuffleInPlace([...confirmedTeams]);

      // Limpa alocações antigas deste scrim
      const delRes = await supabase.from("scrim_group_teams").delete().in("group_id", groupIds);
      if (delRes.error) throw delRes.error;

      const rows = teamIds.map((teamId, idx) => ({
        group_id: groupIds[idx % groupIds.length],
        team_id: teamId,
      }));

      const insRes = await supabase.from("scrim_group_teams").insert(rows);
      if (insRes.error) throw insRes.error;

      toast.success("Sorteio concluído! Equipes distribuídas nos grupos.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sortear equipes");
    } finally {
      setShuffling(false);
      setConfirmShuffleOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Grupos"
            description={enabled ? "Organize as equipes por grupos e use o sorteio." : "Ative grupos para organizar e sortear."}
            icon={Users}
            active={enabled}
          />
        ) : (
          <Button
            type="button"
            variant={enabled ? "default" : "outline"}
            size="sm"
            className={
              "w-full justify-center gap-2 " +
              (enabled ? "bg-gradient-primary glow" : "bg-background/40 hover:bg-accent/30")
            }
          >
            <Users className="h-4 w-4" />
            Grupos
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Grupos do Scrim</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/30 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Label className="text-sm font-semibold">Usar grupos</Label>
                <p className="text-xs text-muted-foreground">
                  Ative para exibir as equipes por grupos e liberar o sorteio automático.
                </p>
              </div>
              <Switch
                checked={!!enabled}
                disabled={!canManage || savingEnabled}
                onCheckedChange={(v) => persistEnabled(!!v)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <Button
                type="button"
                className="gap-2"
                variant="default"
                onClick={() => setConfirmShuffleOpen(true)}
                disabled={!canManage || !enabled || shuffling}
              >
                <Shuffle className="h-4 w-4" />
                {shuffling ? "Sorteando…" : "Sortear automaticamente"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {confirmedTeams.length} equipe(s) confirmada(s)
              </p>
            </div>
          </div>

          <Separator />

          {enabled ? (
            <ScrimGroupsManager trainingId={trainingId} canManage={canManage} registrations={registrations} />
          ) : (
            <div className="rounded-xl border border-border bg-background/30 p-6 text-sm text-muted-foreground">
              Grupos desativados. Ative acima para gerenciar e exibir grupos.
            </div>
          )}
        </div>

        <AlertDialog open={confirmShuffleOpen} onOpenChange={setConfirmShuffleOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar sorteio</AlertDialogTitle>
              <AlertDialogDescription>
                Isso vai apagar a alocação atual de equipes nos grupos e redistribuir tudo automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmShuffleOpen(false)}>
                Cancelar
              </Button>
              <AlertDialogAction onClick={handleShuffle}>
                Sortear agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
