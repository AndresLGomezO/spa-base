import type { GroupedTableColumn } from "@repo/entities";
import {
  resolveDisplayRangeVisibility,
  type ResponsiveGridBreakpoint,
  type ResolvedDisplayRangeVisibility,
} from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";

function resolveGroupedTableColumnDisplayRange(
  column: Pick<GroupedTableColumn, "displayFrom" | "displayTo">,
  atBreakpoint?: ResponsiveGridBreakpoint,
): ResolvedDisplayRangeVisibility {
  return resolveDisplayRangeVisibility(
    column.displayFrom,
    column.displayTo,
    atBreakpoint,
    "table-cell",
  );
}

export function shouldRenderGroupedTableColumn(
  column: Pick<GroupedTableColumn, "displayFrom" | "displayTo">,
  atBreakpoint?: ResponsiveGridBreakpoint,
): boolean {
  return !resolveGroupedTableColumnDisplayRange(column, atBreakpoint).hidden;
}

export function groupedTableColumnVisibilityClassName(
  column: Pick<GroupedTableColumn, "displayFrom" | "displayTo">,
  atBreakpoint?: ResponsiveGridBreakpoint,
  className?: string,
): string | undefined {
  const displayRange = resolveGroupedTableColumnDisplayRange(
    column,
    atBreakpoint,
  );

  if (displayRange.hidden) {
    return undefined;
  }

  return cn(className, displayRange.className);
}
