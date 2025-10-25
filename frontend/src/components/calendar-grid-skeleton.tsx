import { Skeleton } from "./ui/skeleton";

interface CalendarGridSkeletonProps {
  view: "month" | "week" | "day";
}

export function CalendarGridSkeleton({ view }: CalendarGridSkeletonProps) {
  if (view === "month") {
    return (
      <div className="p-6">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        
        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[120px] p-2 border border-border/20 rounded-lg">
              <Skeleton className="h-6 w-6 mb-2" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === "week") {
    return (
      <div className="p-6">
        {/* Week view skeleton */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="min-h-[400px] p-2 border border-border/20 rounded-lg">
              <Skeleton className="h-6 w-6 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Day view skeleton
  return (
    <div className="p-6">
      <div className="min-h-[400px] p-4 border border-border/20 rounded-lg">
        <Skeleton className="h-6 w-6 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border border-border/20 rounded">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
