import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card border-border animate-fade-in">
      <div className="h-24 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="absolute -bottom-8 left-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
        </div>
      </div>

      <div className="pt-10 pb-4 px-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-20" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
    </Card>
  );
}
