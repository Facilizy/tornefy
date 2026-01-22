import { Skeleton } from "@/components/ui/skeleton";

export function TrainingTeamsPreviewSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
        >
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
