import { cn } from "@repo/theme/utils";

export interface ChartBusySpinnerProps {
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function ChartBusySpinner({
  ariaLabel = "Loading",
  className,
}: ChartBusySpinnerProps) {
  const dotClass =
    "bg-muted-foreground inline-block size-1 shrink-0 animate-bounce rounded-full";

  return (
    <div
      aria-busy="true"
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <span
        role="status"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1"
      >
        <span className={dotClass} style={{ animationDelay: "0ms" }} />
        <span className={dotClass} style={{ animationDelay: "150ms" }} />
        <span className={dotClass} style={{ animationDelay: "300ms" }} />
      </span>
    </div>
  );
}
