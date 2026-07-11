import type { UserComponentConfig } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  resolveMetricKpiPresentation,
  splitStyleRuleClasses,
  stylesIncludeVisualChrome,
  textInlineStyleFromStyleRules,
  textWrapClassFromStyles,
} from "@repo/ui-builder-core";
import { Avatar, CardFieldValue, sidebarMenuButtonClassName } from "@repo/ui";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import { UserProfileMenu } from "../user/UserProfileMenu";
import {
  avatarShapeClassName,
  getUserInitials,
} from "../user/user-profile.utils";

export interface LayoutUserInfo {
  readonly displayName: string | null;
  readonly email: string | null;
  readonly photoURL: string | null;
}

function resolveLayoutUserDisplayName(
  user: LayoutUserInfo | null | undefined,
  fallbackName: string,
): string {
  if (!user) {
    return fallbackName;
  }

  return (
    user.displayName?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    fallbackName
  );
}

function formatUserName(
  fullName: string,
  nameFormat: UserComponentConfig["nameFormat"],
): string {
  if (nameFormat !== "first") {
    return fullName;
  }

  const firstName = fullName.trim().split(/\s+/).filter(Boolean)[0];
  return firstName ?? fullName;
}

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

interface LayoutUserDisplayProps {
  readonly config: UserComponentConfig;
  readonly user: LayoutUserInfo | null | undefined;
  readonly fallbackName: string;
  readonly iconsOnly?: boolean;
  /** Match hardcoded AppSidebar profile trigger (sidebar menu button). */
  readonly sidebarChrome?: boolean;
}

export function LayoutUserDisplay({
  config,
  user,
  fallbackName,
  iconsOnly = false,
  sidebarChrome = false,
}: LayoutUserDisplayProps) {
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const { containerClassName, textClassName } =
    splitStyleRuleClasses(innerStyles);
  const containerStyle = layoutInlineStyleFromStyleRules(innerStyles);
  const valueStyle = textInlineStyleFromStyleRules(innerStyles);
  const textSize = fontSizePxFromStyles(innerStyles);
  const valueClassName = [textWrapClassFromStyles(innerStyles), textClassName]
    .filter(Boolean)
    .join(" ");
  const styleFontSize = fontSizePxFromStyles(config.styles);
  const configuredImageSize =
    config.imageSize ?? (sidebarChrome ? undefined : (styleFontSize ?? 40));
  const imageSize =
    configuredImageSize == null
      ? undefined
      : iconsOnly && !sidebarChrome
        ? Math.min(configuredImageSize, 32)
        : configuredImageSize;
  const photoSizePx = imageSize ?? (iconsOnly ? 32 : 40);
  const displayName = formatUserName(
    resolveLayoutUserDisplayName(user, fallbackName),
    config.nameFormat,
  );
  const email = user?.email?.trim() ?? "";
  const labelText = config.label?.text?.trim();
  const showLabel =
    !iconsOnly && config.label?.show === true && Boolean(labelText);
  const avatarClassName = avatarShapeClassName(config.avatarShape);
  const hideTextClassName = "group-data-[collapsible=icon]/sidebar:hidden";
  const useSidebarStyle = sidebarChrome || iconsOnly;

  if (config.display === "profile-button") {
    const presentation = resolveMetricKpiPresentation(innerStyles);
    const customChrome = stylesIncludeVisualChrome(config.styles);
    const showDetails =
      sidebarChrome || !iconsOnly
        ? (config.profileButtonContent ?? "full") === "full"
        : false;

    return (
      <div
        className={cn(
          useSidebarStyle ? "w-full" : "w-fit max-w-full shrink-0",
          iconsOnly && !sidebarChrome && "flex justify-center",
          presentation.className,
          containerClassName,
        )}
        style={{ ...presentation.style, ...containerStyle }}
      >
        <ResponsiveStyleTag cssText={presentation.cssText} />
        <UserProfileMenu
          placement={useSidebarStyle ? "right-start" : "bottom-end"}
          fullWidth={useSidebarStyle}
          imageSize={imageSize}
          avatarShape={config.avatarShape}
          showDetails={showDetails}
          showArrow={config.profileButtonShowArrow !== false}
          presentation={presentation}
          customChrome={customChrome}
          textClassName={cn(
            sidebarChrome && "text-sidebar-foreground",
            valueClassName,
          )}
          hideTextClassName={hideTextClassName}
          triggerClassName={
            sidebarChrome
              ? sidebarMenuButtonClassName({ size: "lg" })
              : iconsOnly
                ? "justify-center px-1.5 py-1.5"
                : undefined
          }
        />
      </div>
    );
  }

  const photo = (
    <span
      className="inline-flex shrink-0"
      style={{ width: photoSizePx, height: photoSizePx }}
    >
      <Avatar
        src={user?.photoURL}
        alt={displayName}
        fallback={getUserInitials(displayName)}
        className={cn("size-full text-[0.65em]", avatarClassName)}
      />
    </span>
  );

  const value = (() => {
    if (iconsOnly) {
      if (
        config.display === "photo" ||
        config.display === "photo-and-name" ||
        config.display === "name"
      ) {
        return photo;
      }
      return photo;
    }

    switch (config.display) {
      case "email":
        return email || fallbackName;
      case "photo":
        return photo;
      case "photo-and-name":
        return (
          <div className="flex min-w-0 items-center gap-3">
            {photo}
            <span className={cn("truncate", hideTextClassName)}>
              {displayName}
            </span>
          </div>
        );
      case "name":
      default:
        return displayName;
    }
  })();

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showLabel}
      labelPosition={config.label?.position ?? "above"}
      labelUppercase={false}
      value={value}
      allowEmpty
      className={cn(
        "w-fit max-w-full shrink-0",
        iconsOnly && "flex w-full justify-center",
        containerClassName,
      )}
      style={containerStyle}
      labelClassName={cn(
        labelAlignClassName(config.label?.align),
        hideTextClassName,
      )}
      valueClassName={valueClassName}
      valueStyle={valueStyle}
      textSize={textSize}
      textBold={config.label?.bold}
      textThin={config.label?.thin}
      textItalic={config.label?.italic}
      textUnderline={config.label?.underline}
      textColor={config.label?.color}
    />
  );
}
