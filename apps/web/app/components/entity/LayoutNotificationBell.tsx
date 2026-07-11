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

const COLLAPSED_SIDEBAR_ICON_PX = 16;

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
  readonly iconsOnly?: boolean;
  /** Match hardcoded AppSidebar notification chrome (menu label + sidebar button). */
  readonly sidebarChrome?: boolean;
}

export function LayoutNotificationBell({
  config,
  iconsOnly = false,
  sidebarChrome = false,
}: LayoutNotificationBellProps) {
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const presentation = resolveMetricKpiPresentation(innerStyles);
  const customChrome = stylesIncludeVisualChrome(config.styles);
  const labelText = config.label?.text?.trim();
  const showCaption =
    !iconsOnly && config.label?.show === true && Boolean(labelText);
  const useSidebarStyle = sidebarChrome || iconsOnly;
  const iconSize = iconsOnly
    ? Math.min(
        config.iconSize ?? COLLAPSED_SIDEBAR_ICON_PX,
        COLLAPSED_SIDEBAR_ICON_PX,
      )
    : config.iconSize;

  const bell = (
    <>
      <ResponsiveStyleTag cssText={presentation.cssText} />
      <NotificationsMenu
        placement={useSidebarStyle ? "right-start" : "bottom-end"}
        iconName={config.iconName ?? "Bell"}
        iconSize={iconSize}
        showBadge={config.showBadge !== false}
        presentation={presentation}
        customChrome={customChrome}
        showLabel={sidebarChrome}
        useSidebarButtonStyle={useSidebarStyle}
        fullWidth={useSidebarStyle}
      />
    </>
  );

  if (!showCaption) {
    return (
      <div
        className={cn(
          useSidebarStyle ? "w-full" : "w-fit max-w-full shrink-0",
          iconsOnly && !sidebarChrome && "flex justify-center",
          presentation.className,
        )}
        style={presentation.style}
      >
        {bell}
      </div>
    );
  }

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showCaption}
      labelPosition={config.label?.position ?? "above"}
      labelUppercase={false}
      value={bell}
      allowEmpty
      className={cn(
        useSidebarStyle ? "w-full" : "w-fit max-w-full shrink-0",
        presentation.className,
      )}
      style={presentation.style}
      labelClassName={cn(
        labelAlignClassName(config.label?.align),
        "group-data-[collapsible=icon]/sidebar:hidden",
      )}
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
