import type { ReactNode } from "react";
import { cn } from "@repo/theme/utils";

interface ExpandableTableRowExpandPanelProps {
  readonly expanded: boolean;
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
}

/** Animated height panel for expandable table row detail (respects reduced motion). */
export function ExpandableTableRowExpandPanel({
  expanded,
  children,
  className,
  contentClassName,
}: ExpandableTableRowExpandPanelProps) {
  return (
    <div
      data-expanded={expanded ? "true" : "false"}
      className={cn(
        "ui-expandable-row-panel grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
      aria-hidden={!expanded}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "transition-opacity duration-300 ease-out motion-reduce:transition-none",
            expanded ? "opacity-100" : "opacity-0",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
