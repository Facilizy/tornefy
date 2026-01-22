import { Badge } from "@/components/ui/badge";
import type { RankTierId } from "@/lib/ranking";

const VARIANTS: Record<RankTierId, { className: string; label: string }> = {
  bronze: { label: "Bronze", className: "bg-muted/40 border-border text-foreground" },
  ouro: { label: "Ouro", className: "bg-primary/10 border-primary/25 text-primary" },
  platina: { label: "Platina", className: "bg-accent/10 border-accent/25 text-accent" },
  diamante: { label: "Diamante", className: "bg-primary/15 border-primary/35 text-foreground" },
  triunfante: { label: "Triunfante", className: "bg-primary/20 border-primary/45 text-primary" },
};

export function RankPill({ tierId }: { tierId: RankTierId }) {
  const v = VARIANTS[tierId];
  return (
    <Badge variant="outline" className={`text-[11px] uppercase tracking-wide ${v.className}`}>
      {v.label}
    </Badge>
  );
}
