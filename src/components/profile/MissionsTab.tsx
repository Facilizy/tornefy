import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type MissionRow = {
  achievementId: string;
  userAchievementId: string | null;
  name: string;
  description: string | null;
  progress: number;
  targetValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
  claimedAt: string | null;
};

export function MissionsTab({
  missions,
  canClaim,
  onClaimed,
}: {
  missions: MissionRow[];
  canClaim: boolean;
  onClaimed?: (missionId: string, claimedAt: string) => void;
}) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [popup, setPopup] = useState<null | { title: string; missionName: string }>(null);

  const sorted = useMemo(() => {
    return missions
      .slice()
      .sort((a, b) => {
        // unlocked+unclaimed first
        const aReady = Number(a.unlocked && !a.claimedAt);
        const bReady = Number(b.unlocked && !b.claimedAt);
        if (bReady !== aReady) return bReady - aReady;

        // then locked
        const aUnlocked = Number(a.unlocked);
        const bUnlocked = Number(b.unlocked);
        if (bUnlocked !== aUnlocked) return bUnlocked - aUnlocked;

        // higher target first
        return (b.targetValue || 0) - (a.targetValue || 0);
      });
  }, [missions]);

  const totals = useMemo(() => {
    const total = missions.length;
    const unlocked = missions.filter((m) => m.unlocked).length;
    const claimed = missions.filter((m) => !!m.claimedAt).length;
    return { total, unlocked, claimed };
  }, [missions]);

  async function claim(m: MissionRow) {
    if (!canClaim) {
      toast.error("Você só pode resgatar no seu perfil");
      return;
    }
    if (!m.unlocked) return;
    if (m.claimedAt) return;
    if (!m.userAchievementId) {
      toast.error("Missão ainda não registrada para resgate");
      return;
    }

    try {
      setClaimingId(m.achievementId);
      const claimedAt = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("user_achievements")
        .update({ claimed_at: claimedAt })
        .eq("id", m.userAchievementId);
      if (error) throw error;

      onClaimed?.(m.achievementId, claimedAt);
      setPopup({ title: "Parabéns!", missionName: m.name });
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao resgatar");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card/50 border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Missões</h2>
              <p className="text-sm text-muted-foreground">
                {totals.claimed} resgatadas • {totals.unlocked} desbloqueadas • {totals.total} totais
              </p>
            </div>
          </div>
          <span className="text-sm text-primary border border-primary/30 px-2 py-0.5 rounded">
            {Math.round(totals.total ? (totals.unlocked / totals.total) * 100 : 0)}%
          </span>
        </div>

        <Progress
          value={totals.total ? (totals.unlocked / totals.total) * 100 : 0}
          className="mt-4 h-1"
        />

        <div className="mt-6">
          {sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma missão cadastrada ainda.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((m) => {
                const percent = m.targetValue ? Math.min(100, (m.progress / m.targetValue) * 100) : 0;
                const ready = m.unlocked && !m.claimedAt;
                const claimed = !!m.claimedAt;

                return (
                  <Card
                    key={m.achievementId}
                    className={
                      "p-5 bg-background/45 border-border overflow-hidden " +
                      (ready
                        ? "ring-1 ring-primary/25 border-primary/25"
                        : claimed
                          ? "opacity-95"
                          : "opacity-95")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={
                            "h-12 w-12 rounded-2xl border border-border flex items-center justify-center shrink-0 " +
                            (claimed
                              ? "bg-primary/12"
                              : ready
                                ? "bg-primary/10"
                                : "bg-muted/30")
                          }
                        >
                          {claimed ? (
                            <Award className="h-6 w-6 text-primary" />
                          ) : m.unlocked ? (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          ) : (
                            <Award className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold uppercase tracking-tight truncate">{m.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {m.description || `Meta: ${m.targetValue}`}
                          </p>
                        </div>
                      </div>

                      {claimed ? (
                        <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Resgatada
                        </span>
                      ) : ready ? (
                        <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Pronta
                        </span>
                      ) : (
                        <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-card/40 text-muted-foreground border border-border">
                          Em progresso
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span className="tabular-nums">
                          {m.progress} / {m.targetValue}
                        </span>
                      </div>
                      <Progress value={percent} className="mt-2 h-1.5" />
                    </div>

                    {ready ? (
                      <Button
                        className="mt-4 w-full"
                        onClick={() => claim(m)}
                        disabled={claimingId === m.achievementId}
                      >
                        {claimingId === m.achievementId ? "Resgatando..." : "Resgatar"}
                      </Button>
                    ) : claimed ? (
                      <Button className="mt-4 w-full" variant="outline" disabled>
                        Emblema resgatado
                      </Button>
                    ) : (
                      <Button className="mt-4 w-full" variant="outline" disabled>
                        Complete a missão
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={!!popup} onOpenChange={(o) => (!o ? setPopup(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{popup?.title || "Parabéns!"}</AlertDialogTitle>
            <AlertDialogDescription>
              Você concluiu a missão <span className="font-semibold">{popup?.missionName}</span> e ganhou um emblema
              para o seu perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPopup(null)}>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
