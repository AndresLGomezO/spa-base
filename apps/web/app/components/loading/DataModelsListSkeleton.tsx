import { Skeleton } from "@repo/ui";

export function DataModelsListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="border-border overflow-hidden rounded-md border">
        <div className="border-border flex gap-6 border-b px-3 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="border-border flex gap-6 border-b px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
