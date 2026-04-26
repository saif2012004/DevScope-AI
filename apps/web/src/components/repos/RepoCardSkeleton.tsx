import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RepoCardSkeleton() {
  return (
    <Card className="transition-shadow duration-200">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-full max-w-[200px]" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full max-w-[180px]" />
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <Skeleton className="h-3 w-28" />
          <div className="flex shrink-0 gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
