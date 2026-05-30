import { Skeleton } from "@repo/ui";

export function RelationPickerSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2" aria-label="Loading">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="h-4 flex-1 max-w-xs" />
        </div>
      ))}
    </div>
  );
}
