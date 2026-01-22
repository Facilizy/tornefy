import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlayerTradingCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className || ""}>
      <Card className="overflow-hidden bg-card/45 border-border backdrop-blur">
        <div className="relative h-[210px] sm:h-[230px]">
          <Skeleton className="absolute inset-0" />
          <div className="absolute left-4 top-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
          </div>
        </div>

        <div className="p-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-6 w-44" />
          <Skeleton className="mt-2 h-4 w-24" />

          <div className="mt-4 grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background/40 px-3 py-2"
              >
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-2 h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
