import type {
  IconComponentConfig,
  MetricKpiPresentation,
  StyleBreakpoint,
} from "@repo/ui-builder-core";
import {
  RESPONSIVE_FONT_SIZE_CSS_VAR,
  resolveMetricKpiPresentation,
} from "@repo/ui-builder-core";
import { CardFieldValue } from "@repo/ui";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import type { CSSProperties } from "react";

import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";

function labelAlignClassName(
  align?: "left" | "center" | "right",
): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return undefined;
}

/**
 * Explicit `iconSize` wins. Otherwise size follows style `fontSize`:
 * - snapped/static px via `presentation.textSize`
 * - responsive production via `--ub-font-size` (1em tracks scoped font-size)
 */
export function resolveLucideIconBoxStyle(
  config: Pick<IconComponentConfig, "iconSize">,
  presentation: Pick<MetricKpiPresentation, "textSize" | "cssText">,
): CSSProperties {
  if (config.iconSize !== undefined) {
    return { width: config.iconSize, height: config.iconSize };
  }

  if (presentation.textSize !== undefined) {
    return {
      width: presentation.textSize,
      height: presentation.textSize,
    };
  }

  if (presentation.cssText !== undefined) {
    return {
      width: "1em",
      height: "1em",
      fontSize: `var(${RESPONSIVE_FONT_SIZE_CSS_VAR})`,
    };
  }

  return { width: 20, height: 20 };
}

export function LayoutLucideIcon({
  config,
  atBreakpoint,
}: {
  readonly config: IconComponentConfig;
  readonly atBreakpoint?: StyleBreakpoint;
}) {
  const Icon = resolveLucideIcon(config.iconName);
  const presentation = resolveMetricKpiPresentation(
    config.styles,
    atBreakpoint,
  );
  const iconBoxStyle = resolveLucideIconBoxStyle(config, presentation);
  const labelText = config.label?.text?.trim();
  const showLabel = config.label?.show === true && Boolean(labelText);

  return (
    <>
      <ResponsiveStyleTag cssText={presentation.cssText} />
      <CardFieldValue
        label={labelText}
        showLabel={showLabel}
        labelPosition={config.label?.position ?? "above"}
        value={
          <Icon
            aria-hidden
            style={iconBoxStyle}
            className="inline-block shrink-0"
          />
        }
        allowEmpty
        className={presentation.className}
        style={presentation.style}
        labelClassName={labelAlignClassName(config.label?.align)}
        valueClassName={[
          "inline-flex items-center",
          presentation.valueClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        valueStyle={presentation.valueStyle}
        textSize={presentation.textSize}
        textBold={config.label?.bold}
        textThin={config.label?.thin}
        textItalic={config.label?.italic}
        textUnderline={config.label?.underline}
        textColor={config.label?.color}
      />
    </>
  );
}
