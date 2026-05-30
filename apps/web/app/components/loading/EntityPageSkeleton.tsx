import { Skeleton } from "@repo/ui";

export function EntityPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex w-full flex-col gap-6"
      aria-label="Loading"
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 min-w-48 flex-1" />
        <Skeleton className="h-10 min-w-48 flex-1" />
      </div>
      <div className="border-border overflow-hidden rounded-md border">
        <div className="border-border flex gap-4 border-b px-3 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="border-border flex gap-4 border-b px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
