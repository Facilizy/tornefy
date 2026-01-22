import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamProfileSkeleton() {
  return (
    <MainLayout>
      <header className="relative overflow-hidden">
        <div className="relative h-52 md:h-72">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-24 md:-mt-28 relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <Card className="flex-1 p-4 md:p-5 bg-card/60 border-border backdrop-blur">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Skeleton className="w-28 h-28 rounded-2xl" />
                <div className="flex-1 w-full">
                  <Skeleton className="h-8 w-64 max-w-full" />
                  <Skeleton className="mt-2 h-4 w-40" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-7 w-24 rounded-full" />
                  </div>
                  <Skeleton className="mt-4 h-4 w-full" />
                </div>
              </div>
            </Card>

            <Card className="w-full lg:w-80 p-4 bg-card/60 border-border backdrop-blur">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="mt-2 h-6 w-36" />
                </div>
                <Skeleton className="h-12 w-24 rounded-xl" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
            </Card>
          </div>

          <div className="mb-6">
            <Skeleton className="h-9 w-40" />
          </div>

          <div className="space-y-4 pb-10">
            <Card className="p-4 bg-card/50 border-border">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </header>
    </MainLayout>
  );
}
