import type { UserComponentConfig } from "@repo/ui-builder-core";
import {
  fontSizePxFromStyles,
  layoutInlineStyleFromStyleRules,
  splitStyleRuleClasses,
} from "@repo/ui-builder-core";
import { Avatar, CardFieldValue, Text } from "@repo/ui";

export interface LayoutUserInfo {
  readonly displayName: string | null;
  readonly email: string | null;
  readonly photoURL: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
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

interface LayoutUserDisplayProps {
  readonly config: UserComponentConfig;
  readonly user: LayoutUserInfo | null | undefined;
  readonly fallbackName: string;
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

export function LayoutUserDisplay({
  config,
  user,
  fallbackName,
}: LayoutUserDisplayProps) {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const containerStyle = layoutInlineStyleFromStyleRules(config.styles);
  const imageSize =
    config.imageSize ?? fontSizePxFromStyles(config.styles) ?? 40;
  const displayName = resolveLayoutUserDisplayName(user, fallbackName);
  const email = user?.email?.trim() ?? "";
  const labelText = config.label?.text?.trim();
  const showLabel = config.label?.show === true && Boolean(labelText);

  const photo = (
    <span
      className="inline-flex shrink-0"
      style={{ width: imageSize, height: imageSize }}
    >
      <Avatar
        src={user?.photoURL}
        alt={displayName}
        fallback={getInitials(displayName)}
        className="size-full text-[0.65em]"
      />
    </span>
  );

  const value = (() => {
    switch (config.display) {
      case "email":
        return <Text className="text-sm">{email || fallbackName}</Text>;
      case "photo":
        return photo;
      case "photo-and-name":
        return (
          <div className="flex min-w-0 items-center gap-3">
            {photo}
            <Text className="truncate text-sm font-medium">{displayName}</Text>
          </div>
        );
      case "name":
      default:
        return <Text className="text-sm font-medium">{displayName}</Text>;
    }
  })();

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showLabel}
      labelPosition={config.label?.position ?? "above"}
      value={value}
      allowEmpty
      className={containerClassName}
      style={containerStyle}
      labelClassName={labelAlignClassName(config.label?.align)}
      valueClassName="min-w-0"
      textBold={config.label?.bold}
      textThin={config.label?.thin}
      textItalic={config.label?.italic}
      textUnderline={config.label?.underline}
      textColor={config.label?.color}
    />
  );
}
