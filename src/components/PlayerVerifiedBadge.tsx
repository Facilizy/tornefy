import { VerifiedBadge } from "@/components/VerifiedBadge";

type PlayerVerifiedBadgeProps = {
  verified?: boolean;
  variant?: "icon" | "pill";
  size?: "sm" | "md";
  className?: string;
};

export function PlayerVerifiedBadge({
  verified = true,
  variant = "icon",
  size = "sm",
  className,
}: PlayerVerifiedBadgeProps) {
  return (
    <VerifiedBadge
      verified={verified}
      variant={variant}
      size={size}
      label="Jogador verificado"
      className={className}
    />
  );
}
