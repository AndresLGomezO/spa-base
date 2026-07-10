import type { NotificationBellComponentConfig } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  resolveMetricKpiPresentation,
  stylesIncludeVisualChrome,
} from "@repo/ui-builder-core";
import { CardFieldValue } from "@repo/ui";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import { NotificationsMenu } from "../../features/notifications/NotificationsMenu";

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

interface LayoutNotificationBellProps {
  readonly config: NotificationBellComponentConfig;
}

export function LayoutNotificationBell({ config }: LayoutNotificationBellProps) {
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const presentation = resolveMetricKpiPresentation(innerStyles);
  const customChrome = stylesIncludeVisualChrome(config.styles);
  const labelText = config.label?.text?.trim();
  const showLabel = config.label?.show === true && Boolean(labelText);

  const bell = (
    <>
      <ResponsiveStyleTag cssText={presentation.cssText} />
      <NotificationsMenu
        placement="bottom-end"
        iconName={config.iconName ?? "Bell"}
        iconSize={config.iconSize}
        showBadge={config.showBadge !== false}
        presentation={presentation}
        customChrome={customChrome}
      />
    </>
  );

  if (!showLabel) {
    return (
      <div
        className={cn("w-fit max-w-full shrink-0", presentation.className)}
        style={presentation.style}
      >
        {bell}
      </div>
    );
  }

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showLabel}
      labelPosition={config.label?.position ?? "above"}
      value={bell}
      allowEmpty
      className={cn("w-fit max-w-full shrink-0", presentation.className)}
      style={presentation.style}
      labelClassName={labelAlignClassName(config.label?.align)}
      valueClassName={presentation.valueClassName}
      valueStyle={presentation.valueStyle}
      textSize={presentation.textSize}
      textBold={config.label?.bold}
      textThin={config.label?.thin}
      textItalic={config.label?.italic}
      textUnderline={config.label?.underline}
      textColor={config.label?.color}
    />
  );
}
