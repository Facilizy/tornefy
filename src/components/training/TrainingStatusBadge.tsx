import { Badge } from "@/components/ui/badge";
import { getTrainingStatusClasses } from "@/lib/training-status";
import { cn } from "@/lib/utils";

type Props = {
  status?: string | null;
  className?: string;
  showFallback?: boolean;
};

export default function TrainingStatusBadge({
  status,
  className,
  showFallback = true,
}: Props) {
  const label = status || (showFallback ? "INSCRIÇÕES ABERTAS" : null);
  if (!label) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-bold text-xs backdrop-blur-sm",
        getTrainingStatusClasses(label),
        className
      )}
    >
      {label}
    </Badge>
  );
}
