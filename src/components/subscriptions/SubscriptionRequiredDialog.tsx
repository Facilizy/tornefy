import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function calcTornefyFee(total: number) {
  const safeTotal = Math.max(0, Math.trunc(Number(total || 0)));
  if (safeTotal <= 0) return { total: safeTotal, fee: 0, net: 0 };
  const fee = Math.min(safeTotal, Math.max(1, Math.floor(safeTotal * 0.08)));
  return { total: safeTotal, fee, net: safeTotal - fee };
}

export type SubscriptionPlanCard = {
  id: string;
  name: string;
  monthly_fee_coins: number;
  period_days?: number | null;
  benefits_text?: string | null;
  max_subscribers?: number | null;
};

export type PlanMembershipInfo = {
  current_period_end?: string | null;
};

export function SubscriptionRequiredDialog({
  open,
  onOpenChange,
  plans,
  membershipsByPlanId,
  loadingPlanId,
  onSubscribe,
  currentBalance = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: SubscriptionPlanCard[];
  membershipsByPlanId?: Record<string, PlanMembershipInfo | null>;
  loadingPlanId?: string | null;
  onSubscribe: (planId: string) => Promise<void>;
  currentBalance?: number;
}) {
  const sortedPlans = (plans || []).slice().sort((a, b) => (b.monthly_fee_coins || 0) - (a.monthly_fee_coins || 0));
  const balanceLabel = Math.max(0, Math.trunc(Number(currentBalance || 0))).toLocaleString("pt-BR");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Assinatura necessária</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Este scrim é exclusivo para assinantes. Qualquer 1 plano abaixo libera a inscrição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background/20 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Seu saldo atual</span>
            <span className="text-xl font-black text-foreground">{balanceLabel} TC</span>
          </div>

          {sortedPlans.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
            </div>
          ) : null}

          {sortedPlans.map((plan) => {
            const periodDays = Number(plan.period_days || 30);
            const breakdown = calcTornefyFee(Number(plan.monthly_fee_coins || 0));
            const membership = membershipsByPlanId?.[String(plan.id)] ?? null;
            const endsAt = membership?.current_period_end ? String(membership.current_period_end) : null;
            const membershipActive = !!endsAt && new Date(endsAt).getTime() > Date.now();

            const remaining = Math.max(0, Math.trunc(Number(currentBalance || 0) - breakdown.total));
            const canPay = (Number(currentBalance || 0) >= breakdown.total);

            return (
              <div key={String(plan.id)} className="rounded-xl border border-border bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="text-base font-semibold truncate">{String(plan.name || "Plano")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="text-base font-black">{breakdown.total} TC</p>
                    <p className="text-xs text-muted-foreground">{periodDays} dias</p>
                  </div>
                </div>

                {plan.benefits_text ? (
                  <p className="mt-3 text-xs text-muted-foreground whitespace-pre-line">{plan.benefits_text}</p>
                ) : null}

                <Separator className="my-3" />

                {!membershipActive && (
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo após assinar:</span>
                    <span className={`font-bold ${canPay ? 'text-foreground' : 'text-destructive'}`}>
                      {remaining.toLocaleString("pt-BR")} TC
                    </span>
                  </div>
                )}

                {/* 
                 // Opção de mostrar breakdown de fees se quiser, mas para usuário final talvez seja detalhe demais
                 // Vou comentar para simplificar, já que a user story foca em saldo e confirmação
                <div className="grid grid-cols-3 gap-3"> ... </div>
                */}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {membershipActive ? (
                    <Badge variant="secondary">Ativa</Badge>
                  ) : (
                    <Badge variant="outline">Inativa</Badge>
                  )}
                </div>

                {endsAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">Válida até: {new Date(endsAt).toLocaleString("pt-BR")}</p>
                ) : null}

                <Button
                  className="mt-4 w-full bg-gradient-primary"
                  disabled={!!loadingPlanId || membershipActive || (!canPay && !membershipActive)}
                  onClick={() => {
                    if (!canPay && !membershipActive) {
                      // talvez redirecionar ou mostrar erro, mas o disabled já previne
                      return;
                    }
                    // confirmar antes
                    if (confirm(`Confirmar assinatura do plano "${plan.name}" por ${breakdown.total} TC?`)) {
                      void onSubscribe(String(plan.id));
                    }
                  }}
                >
                  {membershipActive
                    ? "Você já é assinante (renove quando expirar)"
                    : !canPay
                      ? "Saldo insuficiente"
                      : loadingPlanId === String(plan.id)
                        ? "Processando…"
                        : `Assinar (${periodDays} dias)`}
                </Button>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground">
            Assinatura libera acesso a scrims exclusivos deste organizador.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
