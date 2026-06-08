import type { ReactNode } from "react";
import { cn } from "@repo/theme/utils";

interface DesignLayoutEditorShellProps {
  readonly children: ReactNode;
  readonly preview?: ReactNode;
  /** e.g. { editor: 2, preview: 1 } for 2/3–1/3 split at lg+ */
  readonly columnRatio?: { editor: number; preview: number };
  /** When true, each column scrolls independently at lg+ */
  readonly independentScroll?: boolean;
}

/** Layout wrapper for design editors: main panel + optional preview column. */
export function DesignLayoutEditorShell({
  children,
  preview,
  columnRatio,
  independentScroll = false,
}: DesignLayoutEditorShellProps) {
  if (!preview) {
    return <div className="flex flex-col gap-6">{children}</div>;
  }

  const hasRatio = columnRatio != null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col-reverse gap-6 lg:flex-row lg:gap-8",
        independentScroll && "overflow-hidden",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-6",
          hasRatio ? "lg:flex-[2]" : "flex-1",
          independentScroll && "min-h-0 lg:overflow-y-auto",
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "min-w-0",
          hasRatio
            ? "lg:flex-[1] lg:shrink-0"
            : "lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)] lg:w-[min(420px,40%)] lg:shrink-0 lg:overflow-y-auto",
          independentScroll && "min-h-0 lg:overflow-y-auto",
        )}
      >
        {preview}
      </div>
    </div>
  );
}
