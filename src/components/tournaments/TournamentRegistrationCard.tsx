import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TorneCoinsSummaryCards } from "@/components/profile-edit/TorneCoinsSummaryCards";
import { GameAccountRequiredDialog } from "@/components/GameAccountRequiredDialog";
import { EntryFeeDialog } from "@/components/EntryFeeDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Team = Tables<"teams">;
type Tournament = Tables<"tournaments">;
type MyRegistration = Tables<"tournament_registrations">;

type Wallet = {
  available: number;
  pending: number;
  frozen: number;
};

export function TournamentRegistrationCard({
  userId,
  tournament,
  myTeams,
  selectedTeamId,
  onSelectedTeamIdChange,
  myRegistration,
  actionLoading,
  onRegister,
  onUnregister,
  wallet,
  onGoTeams,
  onGoAuth,
}: {
  userId: string | null;
  tournament: Tournament;
  myTeams: Team[];
  selectedTeamId: string;
  onSelectedTeamIdChange: (next: string) => void;
  myRegistration: MyRegistration | null;
  actionLoading: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  wallet: Wallet | null;
  onGoTeams: () => void;
  onGoAuth: () => void;
}) {
  const fee = Number(tournament.entry_fee_coins || 0);
  const isPaid = fee > 0;

  const [missingGameDialogOpen, setMissingGameDialogOpen] = useState(false);
  const [missingGameDialogCount, setMissingGameDialogCount] = useState(0);

  const [entryFeeOpen, setEntryFeeOpen] = useState(false);

  const canPay = useMemo(() => {
    if (!isPaid) return true;
    const available = Number(wallet?.available ?? 0);
    return available >= fee;
  }, [fee, isPaid, wallet?.available]);

  const canCancel = useMemo(() => {
    // MVP: cancelamento automático apenas para torneios gratuitos
    return !isPaid;
  }, [isPaid]);

  const goToIntegrations = () => {
    window.location.assign("/profile/edit?section=integracoes");
  };

  const handleRegisterClick = async () => {
    const gameId = String((tournament as any)?.game || "").trim();
    if (gameId && selectedTeamId) {
      try {
        const { data: members, error: membersErr } = await supabase
          .from("team_members")
          .select("user_id,player_name")
          .eq("team_id", selectedTeamId);
        if (membersErr) throw membersErr;

        const rows = (members || []) as any[];
        const internalUserIds = Array.from(new Set(rows.map((m) => String(m.user_id || "")).filter(Boolean)));

        const externalsMissing = rows.filter((m) => !m.user_id && !String(m.player_name || "").trim()).length;

        let internalsMissing = 0;
        if (internalUserIds.length > 0) {
          const { data: accounts, error: accErr } = await supabase
            .from("player_game_accounts")
            .select("user_id,in_game_nick")
            .eq("game_id", gameId)
            .in("user_id", internalUserIds);
          if (accErr) throw accErr;

          const okUserIds = new Set(
            (accounts || [])
              .filter((a: any) => String(a.in_game_nick || "").trim())
              .map((a: any) => String(a.user_id))
          );

          internalsMissing = internalUserIds.filter((uid) => !okUserIds.has(String(uid))).length;
        }

        const missingCount = externalsMissing + internalsMissing;
        if (missingCount > 0) {
          setMissingGameDialogCount(missingCount);
          setMissingGameDialogOpen(true);
          return;
        }
      } catch (e) {
        console.warn("tournament game account validation failed", e);
      }
    }

    if (isPaid) {
      setEntryFeeOpen(true);
      return;
    }

    onRegister();
  };

  const subtitle = useMemo(() => {
    const dt = (tournament as any)?.datetime;
    if (!dt) return null;
    try {
      return format(new Date(dt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  }, [tournament]);

  return (
    <Card className="p-6 bg-card/50 border-border">
      <h2 className="text-base font-black uppercase tracking-wide">Inscrição</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPaid
          ? `Taxa de inscrição: ${fee} TorneCoins.`
          : "MVP: inscrição gratuita (pagamento em TorneCoins entra na próxima fase)."}
      </p>

      <GameAccountRequiredDialog
        open={missingGameDialogOpen}
        onOpenChange={setMissingGameDialogOpen}
        gameId={String((tournament as any)?.game || "").trim()}
        missingCount={missingGameDialogCount}
        onGoIntegrations={goToIntegrations}
      />

      {isPaid ? (
        <EntryFeeDialog
          open={entryFeeOpen}
          onOpenChange={setEntryFeeOpen}
          feeCoins={fee}
          title={String((tournament as any)?.name || "Torneio")}
          subtitle={subtitle}
          teamName={myTeams.find((t) => String(t.id) === String(selectedTeamId))?.name || ""}
          canPay={canPay}
          loading={actionLoading}
          onGoTopup={() => window.location.assign("/profile/edit?section=resumo")}
          onPay={() => {
            setEntryFeeOpen(false);
            onRegister();
          }}
        />
      ) : null}

      {userId ? (
        <>
          {wallet ? (
            <div className="mt-4">
              <TorneCoinsSummaryCards
                points={wallet.available + wallet.pending + wallet.frozen}
                pending={wallet.pending + wallet.frozen}
                available={wallet.available}
              />
            </div>
          ) : null}

          <div className="mt-4">
            {myTeams.length === 0 ? (
              <div className="rounded-xl border border-border bg-background/30 p-4">
                <p className="text-sm text-muted-foreground">Você ainda não tem um time. Crie um para se inscrever.</p>
                <div className="mt-3">
                  <Button variant="outline" onClick={onGoTeams}>
                    Ir para equipes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background/30 p-4">
                <p className="text-sm font-semibold">Seu time</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <select
                    className="h-10 rounded-md border border-border bg-background/40 px-3 text-sm"
                    value={selectedTeamId}
                    onChange={(e) => onSelectedTeamIdChange(e.target.value)}
                  >
                    {myTeams.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name || t.tag || "Meu time"}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    {myRegistration ? (
                      <>
                        <Badge variant="secondary" className="uppercase tracking-wide">
                          {myRegistration.status}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={onUnregister}
                          disabled={actionLoading || !canCancel}
                          title={
                            canCancel
                              ? undefined
                              : "Torneios pagos: cancelamento/estorno ainda não está disponível no MVP."
                          }
                        >
                          {actionLoading ? "Aguarde…" : "Cancelar"}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleRegisterClick} disabled={actionLoading}>
                        {actionLoading ? "Inscrevendo…" : "Inscrever"}
                      </Button>
                    )}
                  </div>
                </div>

                {isPaid ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Ao inscrever, a taxa é transferida para o cofrezinho (escrow) do torneio.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-background/30 p-4">
          <p className="text-sm text-muted-foreground">Faça login para inscrever seu time.</p>
          <div className="mt-3">
            <Button onClick={onGoAuth}>Entrar</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

