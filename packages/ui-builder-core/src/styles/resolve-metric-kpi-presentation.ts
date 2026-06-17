import {
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
  stylesIncludeFlexGrow,
  textInlineStyleFromStyleRules,
  textWrapClassFromStyles,
  type LayoutInlineStyle,
  type TextInlineStyle,
} from "./apply-style-rules.js";
import { filterComponentInnerStyleRules } from "./row-slot-styles.js";
import type { StyleRule } from "./style-types.js";

export interface MetricKpiPresentation {
  readonly className: string;
  readonly style: LayoutInlineStyle;
  readonly valueClassName: string;
  readonly valueStyle?: TextInlineStyle;
  readonly textSize?: number;
}

export function resolveMetricKpiPresentation(
  styles: readonly StyleRule[] | undefined,
): MetricKpiPresentation {
  const innerStyles = filterComponentInnerStyleRules(styles);
  const split = splitStyleRuleClasses(innerStyles);
  const containerClassName = stylesIncludeFlexGrow(innerStyles)
    ? [split.containerClassName, "w-full"].filter(Boolean).join(" ")
    : split.containerClassName;

  return {
    className: containerClassName,
    style: layoutInlineStyleFromStyleRules(innerStyles),
    valueClassName: [textWrapClassFromStyles(innerStyles), split.textClassName]
      .filter(Boolean)
      .join(" "),
    valueStyle: textInlineStyleFromStyleRules(innerStyles),
    textSize: fontSizePxFromStyles(innerStyles),
  };
}
