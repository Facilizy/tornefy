import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Coins, Download } from "lucide-react";
import { WithdrawalDialog } from "./WithdrawalDialog";

export function TorneCoinsSummaryCards({
  className,
  points = 0,
  pending = 0,
  available = 0,
  onBalanceUpdate,
}: {
  className?: string;
  points?: number;
  pending?: number;
  available?: number;
  onBalanceUpdate?: () => void;
}) {
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);

  const format = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <>
      <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
        {/* TorneCoins Total Card */}
        <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-primary/20 via-card/60 to-card/40 p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/90">
                TorneCoins
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight">{format(points)}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Saldo total</p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 shadow-lg shadow-primary/20 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-primary/30">
              <Coins className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Pending Balance Card */}
        <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-amber-500/10 via-card/60 to-card/40 p-5 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/90">
                Saldo a liberar
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight">{format(pending)}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Aguardando liberação</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 shadow-lg shadow-amber-500/20 backdrop-blur-sm transition-all group-hover:scale-110 group-hover:border-amber-500/50 group-hover:shadow-amber-500/30">
              <Download className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <div className="relative mt-3 rounded-lg border border-border/30 bg-background/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              Bônus/ganhos ainda não disponíveis para saque.
            </p>
          </div>
        </Card>

        {/* Available Balance Card */}
        <Card className="group relative overflow-hidden border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-card/40 p-5 shadow-lg shadow-emerald-500/10 transition-all hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/20">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl transition-all group-hover:bg-emerald-500/30" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/90">
                Saldo disponível
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white">{format(available)}</p>
              <p className="mt-1 text-xs text-emerald-100/70">Pronto para saque</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={available <= 0}
              onClick={() => setWithdrawalDialogOpen(true)}
              className="gap-2 bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Retirar
            </Button>
          </div>
        </Card>
      </div>

      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        availableBalance={available}
        onSuccess={onBalanceUpdate}
      />
    </>
  );
}
