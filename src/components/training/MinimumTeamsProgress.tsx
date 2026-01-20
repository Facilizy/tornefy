import { Users } from "lucide-react";

export function MinimumTeamsProgress({
  confirmedTeams,
  maxTeams,
  primaryColor,
}: {
  confirmedTeams: number;
  maxTeams: number;
  primaryColor: string;
}) {
  const safeMax = Math.max(1, maxTeams || 1);
  const safeConfirmed = Math.max(0, Math.min(confirmedTeams, safeMax));

  const pct = (safeConfirmed / safeMax) * 100;
  const remaining = Math.max(0, safeMax - safeConfirmed);

  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-4 h-4" style={{ color: primaryColor }} />
          Vagas preenchidas
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold" style={{ color: primaryColor }}>
            {safeConfirmed}/{safeMax}
          </span>
          <span>times</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: primaryColor }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {remaining > 0 ? `Faltam ${remaining} times para lotar` : "Treino lotado"}
          </span>
          <span>{safeMax} max</span>
        </div>
      </div>
    </div>
  );
}
