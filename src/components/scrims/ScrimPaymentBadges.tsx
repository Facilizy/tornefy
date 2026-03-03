import { type CSSProperties, useMemo } from "react";
import { hexToHslTriplet } from "@/lib/color";

export function ScrimPaymentBadges({
  entryFeeCoins,
  prizeCoins,
  prizeText,
  primaryColor,
  secondaryColor,
}: {
  entryFeeCoins?: number | null;
  prizeCoins?: number | null;
  prizeText?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const fee = Math.max(0, Math.trunc(Number(entryFeeCoins ?? 0)));
  const prize = Math.max(0, Math.trunc(Number(prizeCoins ?? 0)));
  const extra = String(prizeText ?? "").trim();

  const eventPrimary = useMemo(() => hexToHslTriplet(String(primaryColor ?? "").trim()) || "", [primaryColor]);
  const eventSecondary = useMemo(() => hexToHslTriplet(String(secondaryColor ?? "").trim()) || "", [secondaryColor]);

  const style = useMemo(() => {
    const s: Record<string, string> = {};
    if (eventPrimary) s["--event-primary"] = eventPrimary;
    if (eventSecondary) s["--event-secondary"] = eventSecondary;
    if (eventPrimary) s["--event-accent"] = eventPrimary;
    return s as CSSProperties;
  }, [eventPrimary, eventSecondary]);



  return (
    <div className="flex items-center justify-between gap-3 min-h-[44px]" style={style}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {fee > 0 ? `Inscrição: ${fee.toLocaleString("pt-BR")} TC` : "Inscrição gratuita"}
        </p>
      </div>

      {/* Mantém o mesmo espaço mesmo quando não há premiação */}
      <div className="shrink-0 text-right w-[92px]" aria-label="Premiação">
        <div className="text-lg font-black tracking-tight text-foreground">
          {prize > 0 ? `${prize.toLocaleString("pt-BR")} TC` : "\u00A0"}
        </div>
      </div>
    </div>
  );
}

