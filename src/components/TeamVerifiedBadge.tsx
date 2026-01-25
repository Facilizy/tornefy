import { VerifiedBadge } from "@/components/VerifiedBadge";

type TeamVerifiedBadgeProps = {
  verified?: boolean;
  variant?: "icon" | "pill";
  size?: "sm" | "md";
  className?: string;
};

export function TeamVerifiedBadge({
  verified = true,
  variant = "icon",
  size = "sm",
  className,
}: TeamVerifiedBadgeProps) {
  return (
    <VerifiedBadge
      verified={verified}
      variant={variant}
      size={size}
      label="Equipe verificada"
      className={className}
    />
  );
}
