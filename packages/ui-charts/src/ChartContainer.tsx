import type { CSSProperties, ReactNode } from "react";
import { ParentSize } from "@visx/responsive";
import { cn } from "@repo/theme/utils";

export function ChartContainer({
  className,
  style,
  ariaLabel,
  children,
}: {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly children: (size: {
    readonly width: number;
    readonly height: number;
  }) => ReactNode;
}) {
  return (
    <div
      className={cn("relative m-0 h-full w-full min-h-0 p-0", className)}
      style={style}
      role="img"
      aria-label={ariaLabel}
    >
      <ParentSize debounceTime={16} className="absolute inset-0">
        {({ width, height }: { width: number; height: number }) => {
          if (width <= 0 || height <= 0) {
            return null;
          }
          return children({ width, height });
        }}
      </ParentSize>
    </div>
  );
}
