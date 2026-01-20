import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  verified?: boolean;
  /** If false, returns null when not verified. */
  showWhenUnverified?: boolean;
  /** Instagram-style icon-only badge or pill */
  variant?: "icon" | "pill";
  size?: "sm" | "md";
  label?: string;
  className?: string;
};

export function VerifiedBadge({
  verified = true,
  showWhenUnverified = false,
  variant = "icon",
  size = "sm",
  label = "Verificado",
  className,
}: VerifiedBadgeProps) {
  if (!verified && !showWhenUnverified) return null;

  const iconSize = size === "md" ? 14 : 12;
  const circleSize = size === "md" ? 20 : 18;

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",
          "border-primary/30 bg-primary/10 text-primary",
          className
        )}
        aria-label={label}
        title={label}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "bg-primary text-primary-foreground",
            size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]"
          )}
        >
          <Check className={cn(size === "md" ? "h-[14px] w-[14px]" : "h-3 w-3")} />
        </span>
        <span className="leading-none">{label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-primary text-primary-foreground",
        className
      )}
      style={{ width: circleSize, height: circleSize }}
      aria-label={label}
      title={label}
    >
      <Check style={{ width: iconSize, height: iconSize }} />
    </span>
  );
}
