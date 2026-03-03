import { cn } from "@/lib/utils";
import type { RankTierId } from "@/lib/ranking";
import { Trophy } from "lucide-react";
import bronzeImg from "@/assets/ranks/bronze.webp";
import prataImg from "@/assets/ranks/prata.webp";
import ouroImg from "@/assets/ranks/ouro.webp";
import platinaImg from "@/assets/ranks/platina.webp";
import diamanteImg from "@/assets/ranks/diamante.webp";
import rubyImg from "@/assets/ranks/ruby.webp";
import esmeraldaImg from "@/assets/ranks/esmeralda.webp";

const TIER_LOGOS: Record<RankTierId, string | null> = {
  bronze: bronzeImg,
  prata: prataImg,
  ouro: ouroImg,
  platina: platinaImg,
  diamante: diamanteImg,
  ruby: rubyImg,
  esmeralda: esmeraldaImg,
  triunfante: null, // TODO: plugar quando enviar a arte
};

export function RankInsignia({
  tierId,
  label,
  size = "md",
  className,
  imgClassName,
}: {
  tierId: RankTierId;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  imgClassName?: string;
}) {
  const src = TIER_LOGOS[tierId];

  const box =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
        ? "h-20 w-20 rounded-2xl"
        : "h-14 w-14 rounded-2xl";

  const fallback = size === "lg" ? 26 : size === "sm" ? 16 : 20;

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border border-border bg-background/40 ring-1 ring-border/50",
        box,
        className
      )}
      aria-label={`Insígnia da patente ${label}`}
    >
      {src ? (
        <img
          src={src}
          alt={`Logo da patente ${label}`}
          className={cn("h-full w-full object-contain p-2", imgClassName)}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full grid place-items-center">
          <Trophy className="text-muted-foreground" size={fallback} />
        </div>
      )}
    </div>
  );
}

export function RankInsigniaWatermark({
  tierId,
  label,
  className,
}: {
  tierId: RankTierId;
  label: string;
  className?: string;
}) {
  const src = TIER_LOGOS[tierId];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`Marca d'água da patente ${label}`}
      className={cn(
        "pointer-events-none absolute -right-6 -top-6 h-28 w-28 rotate-12 opacity-35 blur-[0.2px]",
        className
      )}
      loading="lazy"
    />
  );
}
