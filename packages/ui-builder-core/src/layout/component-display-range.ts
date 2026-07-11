import {
  RESPONSIVE_BREAKPOINT_ORDER,
  type ResponsiveGridBreakpoint,
} from "./responsive-grid.js";

export const DEFAULT_DISPLAY_FROM: ResponsiveGridBreakpoint = "base";
export const DEFAULT_DISPLAY_TO: ResponsiveGridBreakpoint = "xl";

const BREAKPOINT_PREFIX: Record<ResponsiveGridBreakpoint, string> = {
  base: "",
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
};

export interface NormalizedDisplayRange {
  readonly from: ResponsiveGridBreakpoint;
  readonly to: ResponsiveGridBreakpoint;
}

export interface BuildDisplayRangeClassNameOptions {
  readonly display?: "flex" | "block" | "table-cell";
}

function breakpointIndex(breakpoint: ResponsiveGridBreakpoint): number {
  return RESPONSIVE_BREAKPOINT_ORDER.indexOf(breakpoint);
}

function nextBreakpoint(
  breakpoint: ResponsiveGridBreakpoint,
): ResponsiveGridBreakpoint | undefined {
  const index = breakpointIndex(breakpoint);
  if (index < 0 || index >= RESPONSIVE_BREAKPOINT_ORDER.length - 1) {
    return undefined;
  }
  return RESPONSIVE_BREAKPOINT_ORDER[index + 1];
}

export function normalizeDisplayRange(
  from?: ResponsiveGridBreakpoint,
  to?: ResponsiveGridBreakpoint,
): NormalizedDisplayRange {
  const resolvedFrom = from ?? DEFAULT_DISPLAY_FROM;
  const resolvedTo = to ?? DEFAULT_DISPLAY_TO;
  if (breakpointIndex(resolvedFrom) <= breakpointIndex(resolvedTo)) {
    return { from: resolvedFrom, to: resolvedTo };
  }
  return { from: resolvedTo, to: resolvedFrom };
}

export function isFullDisplayRange(
  from?: ResponsiveGridBreakpoint,
  to?: ResponsiveGridBreakpoint,
): boolean {
  if (from === undefined && to === undefined) {
    return true;
  }
  const { from: normalizedFrom, to: normalizedTo } = normalizeDisplayRange(
    from,
    to,
  );
  return (
    normalizedFrom === DEFAULT_DISPLAY_FROM &&
    normalizedTo === DEFAULT_DISPLAY_TO
  );
}

export function isVisibleAtBreakpoint(
  from: ResponsiveGridBreakpoint | undefined,
  to: ResponsiveGridBreakpoint | undefined,
  breakpoint: ResponsiveGridBreakpoint,
): boolean {
  if (isFullDisplayRange(from, to)) {
    return true;
  }
  const { from: normalizedFrom, to: normalizedTo } = normalizeDisplayRange(
    from,
    to,
  );
  const index = breakpointIndex(breakpoint);
  return (
    index >= breakpointIndex(normalizedFrom) &&
    index <= breakpointIndex(normalizedTo)
  );
}

export function buildDisplayRangeClassName(
  from?: ResponsiveGridBreakpoint,
  to?: ResponsiveGridBreakpoint,
  options: BuildDisplayRangeClassNameOptions = {},
): string | undefined {
  if (isFullDisplayRange(from, to)) {
    return undefined;
  }

  const { from: normalizedFrom, to: normalizedTo } = normalizeDisplayRange(
    from,
    to,
  );
  const display = options.display ?? "flex";
  const classes: string[] = ["hidden"];

  if (normalizedFrom === "base") {
    // Show only below the breakpoint after `to` (avoids bare `flex` fighting `sm:hidden`).
    const after = nextBreakpoint(normalizedTo);
    if (after) {
      classes.push(`max-${after}:${display}`);
    } else {
      classes.push(display);
    }
  } else {
    classes.push(`${BREAKPOINT_PREFIX[normalizedFrom]}${display}`);
  }

  if (normalizedFrom !== "base" && normalizedTo !== "xl") {
    const after = nextBreakpoint(normalizedTo);
    if (after) {
      classes.push(`${BREAKPOINT_PREFIX[after]}hidden`);
    }
  }

  return classes.join(" ");
}

export interface ResolvedDisplayRangeVisibility {
  readonly hidden: boolean;
  readonly className?: string;
}

export function resolveDisplayRangeVisibility(
  displayFrom: ResponsiveGridBreakpoint | undefined,
  displayTo: ResponsiveGridBreakpoint | undefined,
  atBreakpoint: ResponsiveGridBreakpoint | undefined,
  displayClassName: "flex" | "block" | "table-cell" = "flex",
): ResolvedDisplayRangeVisibility {
  if (
    atBreakpoint !== undefined &&
    !isVisibleAtBreakpoint(displayFrom, displayTo, atBreakpoint)
  ) {
    return { hidden: true };
  }

  if (atBreakpoint !== undefined) {
    return { hidden: false };
  }

  return {
    hidden: false,
    className: buildDisplayRangeClassName(displayFrom, displayTo, {
      display: displayClassName,
    }),
  };
}

/** Tailwind safelist: keep display-range utilities in the CSS bundle. */
export const DISPLAY_RANGE_TAILWIND_SAFELIST = [
  "hidden",
  "sm:hidden",
  "md:hidden",
  "lg:hidden",
  "xl:hidden",
  "max-sm:flex",
  "max-md:flex",
  "max-lg:flex",
  "max-xl:flex",
  "max-sm:block",
  "max-md:block",
  "max-lg:block",
  "max-xl:block",
  "max-sm:table-cell",
  "max-md:table-cell",
  "max-lg:table-cell",
  "max-xl:table-cell",
  "sm:flex",
  "md:flex",
  "lg:flex",
  "xl:flex",
  "sm:block",
  "md:block",
  "lg:block",
  "xl:block",
  "sm:table-cell",
  "md:table-cell",
  "lg:table-cell",
  "xl:table-cell",
] as const;
