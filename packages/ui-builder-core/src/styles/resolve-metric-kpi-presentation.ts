import {
  stylesIncludeFlexGrow,
  textWrapClassFromStyles,
  type LayoutInlineStyle,
  type TextInlineStyle,
} from "./apply-style-rules.js";
import { resolveComponentRenderStyles } from "./resolve-component-render-styles.js";
import { collapseStyleRulesAtBreakpoint } from "./responsive-style-rules.js";
import { filterComponentInnerStyleRules } from "./row-slot-styles.js";
import type { StyleBreakpoint, StyleRule } from "./style-types.js";

export interface MetricKpiPresentation {
  readonly className: string;
  readonly style: LayoutInlineStyle;
  readonly valueClassName: string;
  readonly valueStyle?: TextInlineStyle;
  readonly textSize?: number;
  readonly cssText?: string;
}

export function resolveMetricKpiPresentation(
  styles: readonly StyleRule[] | undefined,
  atBreakpoint?: StyleBreakpoint,
): MetricKpiPresentation {
  const innerStyles = filterComponentInnerStyleRules(styles);
  const rendered = resolveComponentRenderStyles(innerStyles, atBreakpoint);
  const wrapSource =
    atBreakpoint !== undefined
      ? collapseStyleRulesAtBreakpoint(innerStyles, atBreakpoint)
      : innerStyles;
  const containerClassName = stylesIncludeFlexGrow(wrapSource)
    ? [rendered.containerClassName, "w-full"].filter(Boolean).join(" ")
    : rendered.containerClassName;

  return {
    className: containerClassName,
    style: rendered.containerStyle,
    valueClassName: [
      textWrapClassFromStyles(wrapSource),
      rendered.textClassName,
    ]
      .filter(Boolean)
      .join(" "),
    valueStyle: rendered.valueStyle,
    textSize: rendered.textSize,
    cssText: rendered.cssText,
  };
}
