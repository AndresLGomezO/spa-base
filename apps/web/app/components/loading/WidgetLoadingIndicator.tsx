import type { SpinnerSize } from "@repo/ui";
import { cn } from "@repo/theme/utils";

interface WidgetLoadingIndicatorProps {
  readonly ariaLabel: string;
  readonly size?: SpinnerSize;
  readonly className?: string;
}

const dotSizeClasses: Record<SpinnerSize, string> = {
  sm: "size-1",
  md: "size-1.5",
  lg: "size-2",
};

export function WidgetLoadingIndicator({
  ariaLabel,
  size = "sm",
  className,
}: WidgetLoadingIndicatorProps) {
  const dotClass = cn(
    "bg-muted-foreground inline-block shrink-0 rounded-full animate-bounce",
    dotSizeClasses[size],
  );

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
