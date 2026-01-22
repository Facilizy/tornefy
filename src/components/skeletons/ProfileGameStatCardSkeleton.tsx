import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileGameStatCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-background/45 border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card/40 px-3 py-2"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-14" />
          </div>
        ))}
      </div>
    </Card>
  );
}
