import { hexToHslTriplet } from "@/lib/color";
import type { ReactNode } from "react";

type DynamicBannerProps = {
  bannerUrl?: string | null;
  title: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  heightClassName?: string;
  className?: string;
  children?: ReactNode;
  fallback?: ReactNode;
};

export function DynamicBanner({
  bannerUrl,
  title,
  primaryColor,
  secondaryColor,
  heightClassName = "h-56",
  className = "",
  children,
  fallback,
}: DynamicBannerProps) {
  const a = primaryColor ? hexToHslTriplet(primaryColor) : null;
  const b = secondaryColor ? hexToHslTriplet(secondaryColor) : null;

  return (
    <div
      className={`relative overflow-hidden ${heightClassName} ${className}`}
      style={
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--banner-a" as any]: a || "var(--primary)",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--banner-b" as any]: b || a || "var(--primary)",
          background: bannerUrl
            ? undefined
            : "linear-gradient(135deg, hsl(var(--banner-a) / 0.62) 0%, hsl(var(--banner-b) / 0.18) 100%)",
        } as React.CSSProperties
      }
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">{fallback}</div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background/0 via-background/35 to-background" />
      {children}
    </div>
  );
}
