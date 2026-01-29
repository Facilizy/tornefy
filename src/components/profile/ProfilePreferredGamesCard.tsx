import { Card } from "@/components/ui/card";
import { getGameLabel, getGameLogo } from "@/lib/games";

export function ProfilePreferredGamesCard({ games }: { games: string[] }) {
  if (!games?.length) return null;

  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Jogos favoritos</p>
          <p className="text-sm text-muted-foreground">Seus jogos preferidos na plataforma</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {games.slice(0, 10).map((g) => {
          const logo = getGameLogo(g);
          const label = getGameLabel(g);
          return (
            <div
              key={g}
              className="h-10 w-10 rounded-xl border border-border bg-background/40 overflow-hidden"
              title={label}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={`Logo do jogo ${label}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-[10px] font-semibold text-muted-foreground">
                  {label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
