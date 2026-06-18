import type { IconComponentConfig } from "@repo/ui-builder-core";
import { resolveMetricKpiPresentation } from "@repo/ui-builder-core";
import { CardFieldValue } from "@repo/ui";

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

export function LayoutLucideIcon({
  config,
}: {
  readonly config: IconComponentConfig;
}) {
  const Icon = resolveLucideIcon(config.iconName);
  const presentation = resolveMetricKpiPresentation(config.styles);
  const iconSize = config.iconSize ?? presentation.textSize ?? 20;
  const labelText = config.label?.text?.trim();
  const showLabel = config.label?.show === true && Boolean(labelText);

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showLabel}
      labelPosition={config.label?.position ?? "above"}
      value={
        <Icon
          aria-hidden
          style={{ width: iconSize, height: iconSize }}
          className="inline-block shrink-0"
        />
      }
      allowEmpty
      className={presentation.className}
      style={presentation.style}
      labelClassName={labelAlignClassName(config.label?.align)}
      valueClassName={["inline-flex items-center", presentation.valueClassName]
        .filter(Boolean)
        .join(" ")}
      valueStyle={presentation.valueStyle}
      textBold={config.label?.bold}
      textThin={config.label?.thin}
      textItalic={config.label?.italic}
      textUnderline={config.label?.underline}
      textColor={config.label?.color}
    />
  );
}
