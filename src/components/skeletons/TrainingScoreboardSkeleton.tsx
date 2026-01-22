import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TrainingScoreboardSkeleton() {
  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-3"
          >
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-52 max-w-full" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}
