import { useMemo, type CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { hexToHslTriplet } from "@/lib/color";

function normalizeLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function PrizeBreakdownCard({
  prizeText,
  primaryColor,
  title = "Premiação",
}: {
  prizeText?: string | null;
  primaryColor?: string | null;
  title?: string;
}) {
  const lines = useMemo(() => normalizeLines(String(prizeText ?? "").trim()), [prizeText]);

  const accent = useMemo(() => {
    const raw = String(primaryColor ?? "").trim();
    return raw ? hexToHslTriplet(raw) : "";
  }, [primaryColor]);

  if (lines.length === 0) return null;

  return (
    <Card
      className="relative overflow-hidden p-6 bg-card/80 border-border"
      style={
        {
          ...(accent ? { "--event-accent": accent } : {}),
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(900px 260px at 10% 0%, hsl(var(--primary) / 0.20), transparent 60%), radial-gradient(700px 240px at 90% 40%, hsl(var(--primary-glow) / 0.14), transparent 55%)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[hsl(var(--event-accent, var(--primary)))]" />
          {title}
        </h3>
        <div className="text-xs text-muted-foreground">{lines.length} item(s)</div>
      </div>

      <div className="relative mt-4 space-y-2">
        <ol className="space-y-2">
          {lines.map((text, idx) => (
            <li
              key={`${idx}-${text}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 text-xs font-black text-muted-foreground">
                {idx + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-relaxed font-medium text-foreground whitespace-pre-wrap">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="pt-2 text-xs text-muted-foreground">
          Dica: edite isso em Configurações → Premiação e Regras (uma linha por item).
        </p>
      </div>
    </Card>
  );
}
