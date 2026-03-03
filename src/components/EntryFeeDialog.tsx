import { Loader2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EntryFeeDialog({
  open,
  onOpenChange,
  feeCoins,
  title,
  subtitle,
  teamName,
  canPay,
  loading,
  errorMessage,
  onPay,
  onGoTopup,
  currentBalance = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeCoins: number;
  title: string;
  subtitle?: string | null;
  teamName?: string | null;
  canPay: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  onPay: () => void;
  onGoTopup: () => void;
  currentBalance?: number;
}) {
  const feeLabel = Math.max(0, Math.trunc(Number(feeCoins || 0))).toLocaleString("pt-BR");
  const balanceLabel = Math.max(0, Math.trunc(Number(currentBalance || 0))).toLocaleString("pt-BR");
  const remainingLabel = Math.max(0, Math.trunc(Number(currentBalance || 0) - Number(feeCoins || 0))).toLocaleString("pt-BR");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">
            Confirmar pagamento
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Para finalizar sua inscrição, confirme a taxa em TorneCoins.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Evento</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
            {teamName ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Equipe:</span> {teamName}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-background/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Saldo atual:</span>
              <span className="text-sm font-semibold">{balanceLabel} TC</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Taxa</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O valor será debitado automaticamente.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black tracking-tight text-foreground">{feeLabel} TC</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saldo final:</span>
              <span className={`text-sm font-black ${canPay ? 'text-primary' : 'text-destructive'}`}>
                {remainingLabel} TC
              </span>
            </div>

            {errorMessage ? (
              <p className="mt-3 text-xs font-semibold text-destructive">{errorMessage}</p>
            ) : null}

            {!canPay ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Saldo insuficiente. Faça uma recarga para continuar.
              </p>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!loading}>Agora não</AlertDialogCancel>

          {!canPay ? (
            <AlertDialogAction
              onClick={() => {
                onOpenChange(false);
                onGoTopup();
              }}
              className="bg-gradient-primary"
              disabled={!!loading}
            >
              Fazer recarga
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onPay();
              }}
              className="bg-gradient-primary"
              disabled={!!loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Pagar e inscrever"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

