import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { entityListPageSlotClassName } from "./entity-list-table-layout";

interface EntityPageListScrollContainerProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** Scroll region for entity/custom main page lists (toolbar and metrics stay fixed above). */
export function EntityPageListScrollContainer({
  children,
  className,
}: EntityPageListScrollContainerProps) {
  return (
    <div
      data-entity-page-list-scroll=""
      className={cn(entityListPageSlotClassName, className)}
    >
      {children}
    </div>
  );
}
