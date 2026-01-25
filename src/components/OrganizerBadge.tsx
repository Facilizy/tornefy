import { VerifiedBadge } from "@/components/VerifiedBadge";

type OrganizerBadgeProps = {
  verified?: boolean;
  variant?: "icon" | "pill";
  size?: "sm" | "md";
  className?: string;
};

export function OrganizerBadge({
  verified = true,
  variant = "icon",
  size = "sm",
  className,
}: OrganizerBadgeProps) {
  return (
    <VerifiedBadge
      verified={verified}
      variant={variant}
      size={size}
      label="Organizador verificado"
      className={className}
    />
  );
}
