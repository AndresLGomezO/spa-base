import {
  buildDisplayRangeClassName,
  isFullDisplayRange,
  isVisibleAtBreakpoint,
  resolveLayoutRootColumns,
  type ResponsiveGridBreakpoint,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

function resolveAppShellChromeRootRow(layout: UiLayoutDocument) {
  const rows = resolveLayoutRootColumns(layout).flatMap(
    (column) => column.rows,
  );
  return rows.length === 1 ? rows[0] : undefined;
}

/**
 * Display classes for app-shell header/footer chrome from the single root row's
 * from–to range. Applied on the chrome element so the bar itself hides, not only
 * its inner content.
 *
 * When `atBreakpoint` is set (designer preview), visibility is snapped for that
 * breakpoint instead of relying on viewport media queries.
 */
export function resolveAppShellChromeDisplayClassName(
  layout: UiLayoutDocument,
  atBreakpoint?: ResponsiveGridBreakpoint,
): string {
  const row = resolveAppShellChromeRootRow(layout);
  if (
    !row ||
    row.type !== "component" ||
    isFullDisplayRange(row.displayFrom, row.displayTo)
  ) {
    return "flex";
  }

  if (atBreakpoint !== undefined) {
    return isVisibleAtBreakpoint(row.displayFrom, row.displayTo, atBreakpoint)
      ? "flex"
      : "hidden";
  }

  return (
    buildDisplayRangeClassName(row.displayFrom, row.displayTo, {
      display: "flex",
    }) ?? "flex"
  );
}
