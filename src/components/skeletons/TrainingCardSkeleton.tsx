import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TrainingCardSkeleton() {
  return (
    <Card className="group overflow-hidden bg-card/70 border-border animate-fade-in">
      <div className="relative h-56 overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </Card>
  );
}
