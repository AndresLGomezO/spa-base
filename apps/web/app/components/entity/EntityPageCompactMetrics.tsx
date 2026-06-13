import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import {
  ENTITY_PAGE_CHROME_TRANSITION,
  useEntityPageScrollCompact,
} from "./entity-page-scroll-compact";

interface EntityPageCompactMetricsProps {
  readonly children: ReactNode;
}

export function EntityPageCompactMetrics({
  children,
}: EntityPageCompactMetricsProps) {
  const { isCompact, compactProgress } = useEntityPageScrollCompact();

  return (
    <div
      data-expanded={isCompact ? "false" : "true"}
      className={cn(
        "grid shrink-0",
        ENTITY_PAGE_CHROME_TRANSITION,
        isCompact
          ? "max-lg:grid-rows-[0fr] max-lg:opacity-0"
          : "grid-rows-[1fr]",
      )}
      style={
        compactProgress > 0 && !isCompact
          ? { opacity: 1 - compactProgress * 0.85 }
          : undefined
      }
      aria-hidden={isCompact ? true : undefined}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
