import { hexToHslTriplet } from "@/lib/color";
import { cn } from "@/lib/utils";
import TornefyLogo from "@/components/TornefyLogo";
import type { RankingArtFormat, TeamRankRow } from "./types";
import type { CSSProperties } from "react";

type Props = {
  format: RankingArtFormat;
  title: string;
  subtitle?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  rows: TeamRankRow[];
  className?: string;
};

const SIZE: Record<RankingArtFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1080 },
  stories: { w: 1080, h: 1920 },
  overlay: { w: 1920, h: 1080 },
};

export function RankingArtCanvas({
  format,
  title,
  subtitle,
  primaryColor,
  secondaryColor,
  rows,
  className,
}: Props) {
  const a = primaryColor ? hexToHslTriplet(primaryColor) : null;
  const b = secondaryColor ? hexToHslTriplet(secondaryColor) : null;

  const size = SIZE[format];
  const [first, ...rest] = rows;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-background text-foreground",
        className,
      )}
      style={
        {
          width: size.w,
          height: size.h,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--rank-a" as any]: a || "var(--primary)",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--rank-b" as any]: b || a || "var(--primary)",
          background:
            "linear-gradient(135deg, hsl(var(--rank-a) / 0.90) 0%, hsl(var(--rank-b) / 0.70) 35%, hsl(var(--background) / 0.92) 100%)",
        } as CSSProperties
      }
    >
      {/* textura/recortes (estilo agressivo) */}
      <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,hsl(var(--foreground)/0.35),transparent_45%),radial-gradient(circle_at_80%_10%,hsl(var(--foreground)/0.18),transparent_55%),radial-gradient(circle_at_60%_90%,hsl(var(--foreground)/0.22),transparent_55%)]" />
      <div className="absolute -left-24 top-24 h-[140%] w-[70%] rotate-[-18deg] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.16),transparent_55%)]" />
      <div className="absolute -right-40 -top-32 h-[80%] w-[70%] rotate-[20deg] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.10),transparent_60%)]" />

      {/* watermark */}
      <div className="absolute right-8 top-8 opacity-[0.10]">
        <TornefyLogo className={cn(format === "stories" ? "w-44" : "w-52")} />
      </div>

      <div className={cn("relative h-full w-full", format === "stories" ? "p-12" : "p-16")}>
        <header className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className={cn("font-black uppercase tracking-tight", format === "overlay" ? "text-5xl" : "text-6xl")}>
              {title}
            </h1>
            {subtitle ? <p className="mt-2 text-sm text-foreground/80">{subtitle}</p> : null}
          </div>

          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-foreground/70">Tornefy</div>
            <div className="text-xs text-foreground/60">Gerador de Ranking</div>
          </div>
        </header>

        <main
          className={cn(
            "mt-10 grid h-[calc(100%-7.5rem)] gap-10",
            format === "stories" ? "grid-cols-1" : "grid-cols-[1.25fr_1fr]",
          )}
        >
          {/* 1º lugar (gigante à esquerda) */}
          <section
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background/40",
              format === "stories" ? "h-[46%]" : "h-full",
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--foreground)/0.16),transparent_60%)]" />

            <div className="relative h-full p-10 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-foreground/70">1º lugar</div>
                  <div className="mt-2 text-6xl font-black leading-[0.9]">#{first?.tag || "—"}</div>
                  <div className="mt-2 text-lg font-semibold text-foreground/90 line-clamp-2">{first?.name || "—"}</div>
                </div>

                <div className="flex items-center gap-3">
                  {first?.logo_url ? (
                    <img
                      src={first.logo_url}
                      alt={first.name}
                      className="h-16 w-16 rounded-xl object-cover border bg-background"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Stat label="PTS" value={first ? String(first.points) : "0"} />
                <Stat label="KILLS" value={first ? String(first.kills) : "0"} />
                <Stat label="PART." value={first ? String(first.matches) : "0"} />
                <Stat label="WINS" value={first ? String(first.wins) : "0"} />
              </div>
            </div>
          </section>

          {/* tabela vertical (direita) */}
          <section
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-background/35",
              format === "stories" ? "h-[54%]" : "h-full",
            )}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent, hsl(var(--background)/0.65))]" />

            <div className="relative h-full p-6">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-foreground/70">
                <span>Posição</span>
                <span className="flex items-center gap-6">
                  <span>PTS</span>
                  <span>K</span>
                  <span>M</span>
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {rest.slice(0, 11).map((r, idx) => (
                  <div
                    key={r.team_id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background/35 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 text-center font-black text-foreground/90">{idx + 2}</div>
                      {r.logo_url ? (
                        <img
                          src={r.logo_url}
                          alt={r.name}
                          className="h-9 w-9 rounded-lg object-cover border bg-background"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-lg border bg-background/50" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight line-clamp-1">{r.tag}</div>
                        <div className="text-xs text-foreground/70 line-clamp-1">{r.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="w-12 text-right font-semibold">{r.points}</div>
                      <div className="w-8 text-right text-foreground/80">{r.kills}</div>
                      <div className="w-8 text-right text-foreground/70">{r.matches}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-4 right-6 text-[10px] text-foreground/55">
                * Top 12
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-foreground/70">{label}</div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
    </div>
  );
}
