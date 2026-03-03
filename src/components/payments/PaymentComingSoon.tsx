import { Coins, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentComingSoonProps {
  className?: string;
  /** Compact mode: smaller card, used inline (e.g. inside a dialog trigger replacement) */
  compact?: boolean;
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
}

/**
 * Generic "Em Breve" (Coming Soon) placeholder for any payment-related feature.
 * Drop-in replacement for payment sections / dialogs while the feature is not live.
 */
export function PaymentComingSoon({
  className,
  compact = false,
  title = "Em Breve",
  description = "Nosso sistema de pagamentos está em desenvolvimento e estará disponível em breve.",
}: PaymentComingSoonProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm text-muted-foreground cursor-default select-none",
          className,
        )}
        title="Funcionalidade em breve"
      >
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="font-semibold uppercase tracking-wide text-xs">Em Breve</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 flex flex-col items-center justify-center text-center gap-4",
        className,
      )}
    >
      {/* Decorative gradient blob */}
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-20">
        <div className="absolute -top-10 -left-10 h-44 w-44 rounded-full bg-primary blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-inner">
        <Coins className="h-8 w-8 text-primary" />
      </div>

      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-primary/80" />
          <p className="text-lg font-black uppercase tracking-tight">{title}</p>
          <Sparkles className="h-4 w-4 text-primary/80" />
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      </div>

      <div className="relative z-10 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
        Sistema de Pagamentos — Em Desenvolvimento
      </div>
    </div>
  );
}
