import { Skeleton } from "@repo/ui";

export function HookListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
