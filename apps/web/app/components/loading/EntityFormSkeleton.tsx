import { Skeleton } from "@repo/ui";

export function EntityFormSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex w-full max-w-xl flex-col gap-4"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-56" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
