import {
  DEFAULT_DISPLAY_FROM,
  DEFAULT_DISPLAY_TO,
  RESPONSIVE_BREAKPOINT_ORDER,
  isFullDisplayRange,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";

export interface ComponentDisplayRangeEditorLabels {
  readonly title: string;
  readonly from: string;
  readonly to: string;
  readonly allScreens: string;
  readonly presetMobileOnly: string;
  readonly presetTabletUp: string;
  readonly presetDesktopOnly: string;
  readonly breakpointBase: string;
  readonly breakpointSm: string;
  readonly breakpointMd: string;
  readonly breakpointLg: string;
  readonly breakpointXl: string;
  readonly breakpointShortBase: string;
  readonly breakpointShortSm: string;
  readonly breakpointShortMd: string;
  readonly breakpointShortLg: string;
  readonly breakpointShortXl: string;
}

export const BREAKPOINT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  keyof ComponentDisplayRangeEditorLabels
> = {
  base: "breakpointBase",
  sm: "breakpointSm",
  md: "breakpointMd",
  lg: "breakpointLg",
  xl: "breakpointXl",
};

export const BREAKPOINT_SHORT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  keyof ComponentDisplayRangeEditorLabels
> = {
  base: "breakpointShortBase",
  sm: "breakpointShortSm",
  md: "breakpointShortMd",
  lg: "breakpointShortLg",
  xl: "breakpointShortXl",
};

export interface DisplayRangePatch {
  readonly displayFrom?: ResponsiveGridBreakpoint;
  readonly displayTo?: ResponsiveGridBreakpoint;
}

export function buildDisplayRangePatch(
  from: ResponsiveGridBreakpoint,
  to: ResponsiveGridBreakpoint,
): DisplayRangePatch {
  if (isFullDisplayRange(from, to)) {
    return clearDisplayRangePatch();
  }
  return { displayFrom: from, displayTo: to };
}

export function clearDisplayRangePatch(): DisplayRangePatch {
  return { displayFrom: undefined, displayTo: undefined };
}

export function readDisplayRange(
  displayFrom?: ResponsiveGridBreakpoint,
  displayTo?: ResponsiveGridBreakpoint,
): {
  readonly from: ResponsiveGridBreakpoint;
  readonly to: ResponsiveGridBreakpoint;
  readonly isAllScreens: boolean;
} {
  const from = displayFrom ?? DEFAULT_DISPLAY_FROM;
  const to = displayTo ?? DEFAULT_DISPLAY_TO;
  return {
    from,
    to,
    isAllScreens: isFullDisplayRange(displayFrom, displayTo),
  };
}

export const DISPLAY_RANGE_BREAKPOINTS = RESPONSIVE_BREAKPOINT_ORDER;
