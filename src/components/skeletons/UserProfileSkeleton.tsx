import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UserProfileSkeleton() {
  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <header className="relative overflow-hidden">
        <div className="relative h-[320px] md:h-[380px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-muted/10 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-24 md:-mt-28 relative z-10">
          <Card className="p-4 md:p-6 bg-card/60 border-border backdrop-blur">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
              <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl" />
              <div className="flex-1 w-full">
                <Skeleton className="h-8 w-64 max-w-full" />
                <Skeleton className="mt-2 h-4 w-36" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </Card>
        </div>
      </header>

      <main className="container mx-auto px-4 relative z-10 pb-12 pt-8">
        <div className="h-10 w-full max-w-xl">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4">
          <div className="space-y-4">
            <Card className="p-6 bg-card/50 border-border">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="mt-3 h-4 w-80 max-w-full" />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </Card>
            <Card className="p-6 bg-card/50 border-border">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-40 w-full" />
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-6 bg-card/50 border-border">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-3 h-24 w-full" />
            </Card>
            <Card className="p-6 bg-card/50 border-border">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-3 h-28 w-full" />
            </Card>
          </aside>
        </div>
      </main>
    </MainLayout>
  );
}
