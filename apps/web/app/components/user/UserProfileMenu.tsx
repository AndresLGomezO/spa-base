import {
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { useTranslation } from "react-i18next";
import { ChevronsUpDown, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

import type { UserAvatarShape, MetricKpiPresentation } from "@repo/ui-builder-core";
import { interactiveTriggerBaseClass } from "@repo/ui-builder-core";
import {
  Avatar,
  Button,
  Popover,
  Text,
  type PopoverPlacement,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle";
import { avatarShapeClassName, getUserInitials } from "./user-profile.utils";

function ProfileMenuDirectionIcon({
  placement,
  className,
}: {
  readonly placement: PopoverPlacement;
  readonly className?: string;
}) {
  if (placement.startsWith("bottom")) {
    return <ChevronDown className={className} aria-hidden />;
  }
  if (placement.startsWith("top")) {
    return <ChevronUp className={className} aria-hidden />;
  }
  return <ChevronRight className={className} aria-hidden />;
}

export interface UserProfileMenuTriggerProps
  extends Omit<
    ComponentPropsWithoutRef<typeof Button>,
    "children" | "fullWidth" | "variant" | "type"
  > {
  readonly displayName: string;
  readonly displayEmail: string;
  readonly roleLabel: string;
  readonly photoURL?: string | null;
  readonly initials: string;
  readonly imageSize?: number;
  readonly avatarShape?: UserAvatarShape;
  readonly fullWidth?: boolean;
  readonly showDetails?: boolean;
  readonly placement?: PopoverPlacement;
  readonly open?: boolean;
  readonly textClassName?: string;
  readonly hideTextClassName?: string;
  readonly presentation?: Pick<
    MetricKpiPresentation,
    "valueClassName" | "valueStyle"
  >;
  readonly customChrome?: boolean;
}

export function UserProfileMenuTrigger({
  displayName,
  displayEmail,
  roleLabel,
  photoURL,
  initials,
  imageSize,
  avatarShape,
  fullWidth = false,
  showDetails = true,
  placement = "right-start",
  open = false,
  textClassName,
  hideTextClassName,
  presentation,
  customChrome = false,
  className,
  onClick,
  ...buttonProps
}: UserProfileMenuTriggerProps) {
  const { t } = useTranslation("common");
  const avatarClassName = avatarShapeClassName(avatarShape);
  const avatar = imageSize ? (
    <span
      className="inline-flex shrink-0"
      style={{ width: imageSize, height: imageSize }}
    >
      <Avatar
        src={photoURL}
        alt={displayName}
        fallback={initials}
        className={cn("size-full text-[0.65em]", avatarClassName)}
      />
    </span>
  ) : (
    <Avatar
      src={photoURL}
      alt={displayName}
      fallback={initials}
      size="md"
      className={avatarClassName}
    />
  );

  return (
    <Button
      type="button"
      variant="ghost"
      fullWidth={fullWidth}
      aria-label={t("nav.userMenu")}
      {...buttonProps}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={cn(
        interactiveTriggerBaseClass(customChrome),
        showDetails ? "justify-start" : "gap-1 px-1 py-1",
        fullWidth ? "w-full" : "w-fit max-w-full",
        open && "bg-sidebar-accent text-sidebar-accent-foreground",
        className,
        presentation?.valueClassName,
      )}
      style={presentation?.valueStyle}
    >
      {avatar}
      {showDetails ? (
        <>
          <div
            className={cn(
              "grid min-w-0 flex-1 text-left leading-tight",
              textClassName,
              hideTextClassName,
            )}
          >
            <span className="truncate font-medium">{displayName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {displayEmail}
            </span>
            <span className="text-muted-foreground truncate text-xs capitalize">
              {roleLabel}
            </span>
          </div>
          <ChevronsUpDown
            className={cn(
              "ml-auto size-4 shrink-0",
              hideTextClassName,
            )}
          />
        </>
      ) : (
        <ProfileMenuDirectionIcon
          placement={placement}
          className="text-muted-foreground size-3.5 shrink-0"
        />
      )}
    </Button>
  );
}

export function UserProfileMenuContent() {
  const { t } = useTranslation("common");
  const {
    user,
    logout,
    tenantRoleNames,
    isSuperAdmin,
    activeTenantName,
    tenantId,
    tenantOptions,
  } = useAuth();

  const displayName = useMemo(
    () =>
      user?.displayName ?? user?.email?.split("@")[0] ?? t("nav.fallbackName"),
    [t, user?.displayName, user?.email],
  );
  const displayEmail = user?.email ?? "";
  const tenantLabel = useMemo(() => {
    if (activeTenantName) {
      return activeTenantName;
    }
    if (!tenantId) {
      return null;
    }
    const option = tenantOptions.find((item) => item.id === tenantId);
    return option?.name ?? tenantId;
  }, [activeTenantName, tenantId, tenantOptions]);
  const roleLabel = useMemo(() => {
    const parts: string[] = [];
    if (isSuperAdmin) {
      parts.push(t("profile.platformSuperadmin"));
    }
    if (tenantRoleNames.length > 0) {
      parts.push(tenantRoleNames.join(", "));
    }
    return parts.length > 0 ? parts.join(" · ") : t("profile.noRole");
  }, [isSuperAdmin, t, tenantRoleNames]);
  const initials = getUserInitials(displayName);

  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar src={user?.photoURL} alt={displayName} fallback={initials} />
        <div className="min-w-0 flex-1 space-y-1">
          <Text className="truncate font-medium">{displayName}</Text>
          <Text variant="caption" className="truncate">
            {displayEmail}
          </Text>
          {tenantLabel ? (
            <Text variant="caption" className="truncate font-medium">
              {tenantLabel}
            </Text>
          ) : null}
          <Text variant="caption" className="truncate capitalize">
            {roleLabel}
          </Text>
        </div>
      </div>
      <div className="border-border border-t pt-3">
        <Text variant="muted" className="mb-2 block text-xs">
          {t("theme.label")}
        </Text>
        <ThemeToggle fullWidth />
      </div>
      <div>
        <Text variant="muted" className="mb-2 block text-xs">
          {t("language.label")}
        </Text>
        <LanguageSwitcher fullWidth />
      </div>
      <Button
        variant="ghost"
        fullWidth
        className="text-destructive hover:text-destructive justify-start"
        onClick={() => void logout()}
      >
        {t("nav.signOut")}
      </Button>
    </>
  );
}

export interface UserProfileMenuProps {
  readonly placement?: PopoverPlacement;
  readonly fullWidth?: boolean;
  readonly imageSize?: number;
  readonly avatarShape?: UserAvatarShape;
  readonly showDetails?: boolean;
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly textClassName?: string;
  readonly hideTextClassName?: string;
  readonly presentation?: Pick<
    MetricKpiPresentation,
    "valueClassName" | "valueStyle"
  >;
  readonly customChrome?: boolean;
}

export function UserProfileMenu({
  placement = "right-start",
  fullWidth = true,
  imageSize,
  avatarShape,
  showDetails = true,
  className,
  triggerClassName,
  textClassName,
  hideTextClassName,
  presentation,
  customChrome = false,
}: UserProfileMenuProps) {
  const { t } = useTranslation("common");
  const {
    user,
    tenantRoleNames,
    isSuperAdmin,
  } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName = useMemo(
    () =>
      user?.displayName ?? user?.email?.split("@")[0] ?? t("nav.fallbackName"),
    [t, user?.displayName, user?.email],
  );
  const displayEmail = user?.email ?? "";
  const roleLabel = useMemo(() => {
    const parts: string[] = [];
    if (isSuperAdmin) {
      parts.push(t("profile.platformSuperadmin"));
    }
    if (tenantRoleNames.length > 0) {
      parts.push(tenantRoleNames.join(", "));
    }
    return parts.length > 0 ? parts.join(" · ") : t("profile.noRole");
  }, [isSuperAdmin, t, tenantRoleNames]);
  const initials = getUserInitials(displayName);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      title={t("nav.userMenu")}
      panelClassName="w-72"
      className={cn(fullWidth ? "block w-full" : "block w-fit max-w-full", className)}
      trigger={
        <UserProfileMenuTrigger
          displayName={displayName}
          displayEmail={displayEmail}
          roleLabel={roleLabel}
          photoURL={user?.photoURL}
          initials={initials}
          imageSize={imageSize}
          avatarShape={avatarShape}
          fullWidth={fullWidth}
          showDetails={showDetails}
          placement={placement}
          open={open}
          textClassName={textClassName}
          hideTextClassName={hideTextClassName}
          presentation={presentation}
          customChrome={customChrome}
          className={triggerClassName}
        />
      }
    >
      <UserProfileMenuContent />
    </Popover>
  );
}
