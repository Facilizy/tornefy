import { cn } from "@/lib/utils";
import { getGameLabel, getGameLogo } from "@/lib/games";

type Props = {
  gameIds?: unknown;
  className?: string;
  variant?: "icons" | "chips";
  size?: "sm" | "md";
};

function normalizeGameIds(gameIds: unknown): string[] {
  if (!Array.isArray(gameIds)) return [];
  return gameIds.filter((g): g is string => typeof g === "string" && g.length > 0);
}

export function IntegratedGamesChips({
  gameIds,
  className,
  variant = "icons",
  size = "sm",
}: Props) {
  const ids = normalizeGameIds(gameIds);
  if (ids.length === 0) return null;

  const iconSizeClass = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const chipPadding = size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5";

  if (variant === "chips") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {ids.map((id) => {
          const logo = getGameLogo(id);
          const label = getGameLabel(id);
          return (
            <span
              key={id}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border bg-background/40",
                chipPadding
              )}
              title={label}
            >
              {logo ? (
                <img
                  src={logo}
                  alt={label}
                  className={cn(iconSizeClass, "object-contain opacity-90")}
                  loading="lazy"
                />
              ) : null}
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {ids.map((id) => {
        const logo = getGameLogo(id);
        const label = getGameLabel(id);
        return (
          <span
            key={id}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background/40 p-1.5"
            title={label}
          >
            {logo ? (
              <img
                src={logo}
                alt={label}
                className={cn(iconSizeClass, "object-contain opacity-90")}
                loading="lazy"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground">{label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
