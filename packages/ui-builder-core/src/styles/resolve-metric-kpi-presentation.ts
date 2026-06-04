import {
  fontSizePxFromStyles,
  resolveStyleRules,
  splitStyleRuleClasses,
  type LayoutInlineStyle,
} from "./apply-style-rules.js";
import type { StyleRule } from "./style-types.js";

export interface MetricKpiPresentation {
  readonly className: string;
  readonly style: LayoutInlineStyle;
  readonly valueClassName: string;
  readonly textSize?: number;
}

export function resolveMetricKpiPresentation(
  styles: readonly StyleRule[] | undefined,
): MetricKpiPresentation {
  const split = splitStyleRuleClasses(styles);
  const resolved = resolveStyleRules(styles);

  return {
    className: resolved.className,
    style: resolved.style,
    valueClassName: split.textClassName,
    textSize: fontSizePxFromStyles(styles),
  };
}
