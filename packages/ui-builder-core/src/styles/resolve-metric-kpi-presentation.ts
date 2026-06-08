import {
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  textWrapClassFromStyles,
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

  return {
    className: split.containerClassName,
    style: layoutInlineStyleFromStyleRules(styles),
    valueClassName: [textWrapClassFromStyles(styles), split.textClassName]
      .filter(Boolean)
      .join(" "),
    textSize: fontSizePxFromStyles(styles),
  };
}
