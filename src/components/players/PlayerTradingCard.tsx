import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { hexToHslTriplet } from "@/lib/color";
import { getRankTier, type GameId } from "@/lib/ranking";

type TeamMini = {
  id: string;
  name: string | null;
  tag: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

export type PlayerCardFrame = {
  id: string;
  slug: string;
  name: string;
  rarity: string;
  accent_hsl: string | null;
  border_hsl: string | null;
  background_hsl: string | null;
  meta: any | null;
};

export type PlayerTradingCardData = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  function?: string | null;
  team?: TeamMini | null;
  game_id?: GameId | string | null;
  rank?: {
    seasonId: string;
    gameId: GameId | string;
    points: number;
    position: number | null;
  } | null;
};

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function PlayerTradingCard({
  player,
  className,
  frame,
}: {
  player: PlayerTradingCardData;
  className?: string;
  frame?: PlayerCardFrame | null;
}) {
  const labelName = player.full_name || player.username || "Jogador";
  const handle = player.username ? `@${player.username}` : "@sem-username";
  const role = player.function || "—";
  const teamTag = player.team?.tag ? `[${player.team.tag}]` : null;

  const accent = player.team?.primary_color
    ? hexToHslTriplet(player.team.primary_color)
    : "var(--primary)";

  const frameAccent = frame?.accent_hsl || null;
  const frameBorder = frame?.border_hsl || frame?.accent_hsl || null;
  const frameBg = frame?.background_hsl || null;
  const rarity = (frame?.rarity || "common").toLowerCase();

  const glowShadow =
    rarity === "epic"
      ? "0 18px 45px -22px hsl(var(--frame-accent) / 0.7), 0 0 0 1px hsl(var(--frame-border) / 0.25)"
      : rarity === "rare"
        ? "0 16px 38px -22px hsl(var(--frame-accent) / 0.55), 0 0 0 1px hsl(var(--frame-border) / 0.22)"
        : "0 12px 30px -22px hsl(var(--frame-accent) / 0.35), 0 0 0 1px hsl(var(--frame-border) / 0.18)";

  const tierLabel = (() => {
    const pts = player.rank?.points;
    if (typeof pts !== "number") return "—";
    const tier = getRankTier({
      points: pts,
      position: player.rank?.position ?? undefined,
      totalPlayers: undefined,
    });
    return tier.label;
  })();

  const pointsLabel = typeof player.rank?.points === "number" ? String(player.rank.points) : "—";
  const positionLabel =
    typeof player.rank?.position === "number" ? `#${player.rank.position}` : "—";

  return (
    <div
      style={
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--card-accent" as any]: accent,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--frame-accent" as any]: frameAccent || "var(--card-accent)",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--frame-border" as any]: frameBorder || "var(--frame-accent)",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--frame-bg" as any]: frameBg || "var(--card)",
        } as React.CSSProperties
      }
      data-rarity={rarity}
      className={cn("relative w-full max-w-[232px]", className)}
    >
      <Card
        className={cn(
          "relative overflow-hidden bg-card/50 border-border backdrop-blur",
          "transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] motion-reduce:transform-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "border-t-[3px] border-t-[hsl(var(--frame-border))]",
          "ring-1 ring-[hsl(var(--frame-border)/0.12)]"
        )}
        style={{
          boxShadow: glowShadow,
        }}
      >
        {/* subtle pattern layer (prepared via meta.style) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.55]"
          style={{
            background:
              frame?.meta?.style === "neon"
                ? "repeating-linear-gradient(135deg, hsl(var(--frame-accent)/0.08) 0px, hsl(var(--frame-accent)/0.08) 10px, transparent 10px, transparent 22px)"
                : frame?.meta?.style === "royal"
                  ? "radial-gradient(600px 300px at 20% 0%, hsl(var(--frame-accent)/0.16) 0%, transparent 60%), repeating-linear-gradient(0deg, transparent 0px, transparent 10px, hsl(var(--frame-accent)/0.06) 10px, hsl(var(--frame-accent)/0.06) 11px)"
                  : "radial-gradient(600px 260px at 15% 0%, hsl(var(--frame-accent)/0.12) 0%, transparent 62%)",
          }}
        />

        {/* top media */}
        <div className="relative h-[196px] sm:h-[212px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(700px 260px at 15% 0%, hsl(var(--frame-accent) / 0.28) 0%, transparent 55%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--frame-accent) / 0.18) 0%, transparent 60%)",
            }}
          />

          <div className="absolute inset-0">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt={`Foto de ${labelName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full grid place-items-center">
                <div className="h-20 w-20 rounded-3xl bg-muted border border-border grid place-items-center text-xl font-black">
                  {initials(labelName)}
                </div>
              </div>
            )}
          </div>

          {/* overlay fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* team logo badge */}
          <div className="absolute left-4 top-4">
            <div className="h-11 w-11 rounded-2xl border border-border bg-background/50 backdrop-blur overflow-hidden">
              {player.team?.logo_url ? (
                <img
                  src={player.team.logo_url}
                  alt={player.team.name || "Logo do time"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-[10px] font-black text-foreground/80">
                  {teamTag ? teamTag.replace(/[\[\]]/g, "") : "—"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* bottom content */}
        <div className="p-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground truncate">
              {player.team?.name || "Sem equipe"}{teamTag ? ` ${teamTag}` : ""}
            </p>
            <h3 className="mt-2 text-[14px] font-black uppercase tracking-tight leading-tight truncate">
              {labelName}
            </h3>
            <p className="mt-1 text-[13px] text-muted-foreground truncate">{handle}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background/40 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Função</p>
              <p className="text-[13px] font-semibold truncate">{role}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Patente</p>
              <p className="text-[13px] font-semibold truncate">{tierLabel}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background/40 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pontos</p>
              <p className="text-[13px] font-semibold tabular-nums truncate">{pointsLabel}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Posição</p>
              <p className="text-[13px] font-semibold tabular-nums truncate">{positionLabel}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
