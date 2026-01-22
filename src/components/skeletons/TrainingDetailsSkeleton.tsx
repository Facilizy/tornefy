import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TrainingDetailsSkeleton() {
  return (
    <MainLayout showFooter={false} showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Skeleton className="h-9 w-28" />
        </div>

        <div className="relative h-[260px] sm:h-[340px] lg:h-[420px] rounded-2xl overflow-hidden mb-6">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          <div className="absolute left-4 right-4 bottom-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-[70%] max-w-[520px]" />
            <Skeleton className="h-4 w-[45%] max-w-[340px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            <Card className="p-4 bg-card/60 border-border">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </Card>

            <Card className="p-5 bg-card/50 border-border">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-[88%]" />
              <Skeleton className="mt-2 h-3 w-[76%]" />

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-5 bg-card/50 border-border">
              <Skeleton className="h-4 w-40" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
              <Skeleton className="mt-5 h-10 w-full" />
            </Card>

            <Card className="p-5 bg-card/50 border-border">
              <Skeleton className="h-4 w-48" />
              <div className="mt-4 grid grid-cols-1 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-background/40 px-3 py-3"
                  >
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </MainLayout>
  );
}
