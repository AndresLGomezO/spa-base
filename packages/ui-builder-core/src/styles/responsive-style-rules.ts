import {
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS,
  RESPONSIVE_GRID_STYLE_PROPERTIES,
  type ResponsiveGridBreakpoint,
} from "../layout/responsive-grid.js";
import type {
  StyleBreakpoint,
  StylePropertyKey,
  StyleRule,
  StyleRuleValue,
} from "./style-types.js";

export type { StyleBreakpoint };

const BREAKPOINT_INDEX: Record<StyleBreakpoint, number> = {
  base: 0,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
};

/** Properties that already have dedicated responsive authors (exclude from StyleRule BP map). */
export function isResponsiveStylePropertyExcluded(
  property: StylePropertyKey,
): boolean {
  return RESPONSIVE_GRID_STYLE_PROPERTIES.has(property);
}

export function styleRuleHasBreakpointOverrides(rule: StyleRule): boolean {
  if (isResponsiveStylePropertyExcluded(rule.property)) {
    return false;
  }

  const map = rule.valuesByBreakpoint;
  if (!map) {
    return false;
  }

  return RESPONSIVE_BREAKPOINT_ORDER.some((bp) => map[bp] !== undefined);
}

export function stylesHaveBreakpointOverrides(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (styles ?? []).some(styleRuleHasBreakpointOverrides);
}

/**
 * Through-cascade resolve:
 * among `valuesByBreakpoint` keys with index >= current, pick the smallest key;
 * else fall back to `value`; else unset.
 */
export function resolveStyleValueAtBreakpoint(
  rule: StyleRule,
  breakpoint: StyleBreakpoint,
): StyleRuleValue | undefined {
  const map = rule.valuesByBreakpoint;
  if (map) {
    const currentIndex = BREAKPOINT_INDEX[breakpoint];
    let best: StyleBreakpoint | undefined;
    for (const bp of RESPONSIVE_BREAKPOINT_ORDER) {
      if (map[bp] === undefined) {
        continue;
      }
      const bpIndex = BREAKPOINT_INDEX[bp];
      if (bpIndex < currentIndex) {
        continue;
      }
      if (best === undefined || bpIndex < BREAKPOINT_INDEX[best]) {
        best = bp;
      }
    }
    if (best !== undefined) {
      return map[best];
    }
  }

  return rule.value;
}

/** Flatten responsive rules to single-value rules for a preview/snapped breakpoint. */
export function collapseStyleRulesAtBreakpoint(
  styles: readonly StyleRule[] | undefined,
  breakpoint: StyleBreakpoint | undefined,
): readonly StyleRule[] {
  if (!styles || styles.length === 0) {
    return styles ?? [];
  }

  if (breakpoint === undefined) {
    return styles;
  }

  const next: StyleRule[] = [];
  for (const rule of styles) {
    if (isResponsiveStylePropertyExcluded(rule.property)) {
      next.push(rule);
      continue;
    }

    if (!styleRuleHasBreakpointOverrides(rule) && rule.value !== undefined) {
      next.push({ property: rule.property, value: rule.value });
      continue;
    }

    const resolved = resolveStyleValueAtBreakpoint(rule, breakpoint);
    if (resolved === undefined) {
      continue;
    }

    next.push({ property: rule.property, value: resolved });
  }

  return next;
}

export function readStyleRuleValue(
  rule: StyleRule,
): StyleRuleValue | undefined {
  return rule.value;
}

/** Effective value at every breakpoint (for mobile-first emission). */
export function resolveStyleValuesAcrossBreakpoints(
  rule: StyleRule,
): Partial<Record<StyleBreakpoint, StyleRuleValue>> {
  if (isResponsiveStylePropertyExcluded(rule.property)) {
    return rule.value !== undefined ? { base: rule.value } : {};
  }

  const result: Partial<Record<StyleBreakpoint, StyleRuleValue>> = {};
  for (const bp of RESPONSIVE_BREAKPOINT_ORDER) {
    const resolved = resolveStyleValueAtBreakpoint(rule, bp);
    if (resolved !== undefined) {
      result[bp] = resolved;
    }
  }
  return result;
}

/** Tailwind / CSS min-width for a breakpoint (`base` has no media query). */
export function mediaMinWidthForBreakpoint(
  breakpoint: Exclude<StyleBreakpoint, "base">,
): number {
  return RESPONSIVE_BREAKPOINT_PREVIEW_WIDTHS[breakpoint];
}

export function tailwindPrefixForBreakpoint(
  breakpoint: StyleBreakpoint,
): string {
  if (breakpoint === "base") {
    return "";
  }
  return `${breakpoint}:`;
}

export type { ResponsiveGridBreakpoint };
