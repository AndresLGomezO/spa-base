import type { IconComponentConfig } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
} from "@repo/ui-builder-core";
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
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName } = splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const iconSize = config.iconSize ?? fontSizePxFromStyles(innerStyles) ?? 20;
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
      className={containerClassName}
      style={containerStyle}
      labelClassName={labelAlignClassName(config.label?.align)}
      valueClassName="inline-flex items-center"
      textBold={config.label?.bold}
      textThin={config.label?.thin}
      textItalic={config.label?.italic}
      textUnderline={config.label?.underline}
      textColor={config.label?.color}
    />
  );
}
