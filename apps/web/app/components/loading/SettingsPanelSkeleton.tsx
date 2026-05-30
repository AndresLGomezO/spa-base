import { Skeleton } from "@repo/ui";

export function SettingsPanelSkeleton({
  variant = "default",
}: {
  readonly variant?: "default" | "appearance";
}) {
  return (
    <div
      aria-busy="true"
      className="flex w-full flex-col gap-6"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-64" />
      {variant === "appearance" ? (
        <>
          <div className="grid max-w-3xl gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </>
      ) : (
        <>
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-48 w-full max-w-3xl" />
          <Skeleton className="h-40 w-full max-w-3xl" />
        </>
      )}
    </div>
  );
}
