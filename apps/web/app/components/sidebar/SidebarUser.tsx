import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronsUpDown } from "lucide-react";

import {
  Avatar,
  Button,
  Popover,
  Text,
  sidebarMenuButtonClassName,
} from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function SidebarUser() {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName = useMemo(
    () =>
      user?.displayName ?? user?.email?.split("@")[0] ?? t("nav.fallbackName"),
    [t, user?.displayName, user?.email],
  );
  const displayEmail = user?.email ?? "";
  const roleKey = user?.role ?? "member";
  const roleLabel = t(`roles.${roleKey}`, { defaultValue: roleKey });
  const initials = getInitials(displayName);

  const profileBlock = (
    <div className="flex items-center gap-3">
      <Avatar src={user?.photoURL} alt={displayName} fallback={initials} />
      <div className="min-w-0 flex-1">
        <Text className="truncate font-medium">{displayName}</Text>
        <Text variant="caption" className="truncate">
          {displayEmail}
        </Text>
        <Text variant="caption" className="truncate capitalize">
          {roleLabel}
        </Text>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-end"
      title={t("nav.userMenu")}
      className="block w-full"
      trigger={
        <Button
          type="button"
          variant="ghost"
          fullWidth
          aria-label={t("nav.userMenu")}
          className={cn(
            sidebarMenuButtonClassName({ size: "lg" }),
            "h-auto justify-start border-0 font-normal shadow-none focus-visible:ring-offset-0",
            open && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Avatar
            src={user?.photoURL}
            alt={displayName}
            fallback={initials}
            size="md"
          />
          <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]/sidebar:hidden">
            <span className="truncate font-medium">{displayName}</span>
            <span className="text-muted truncate text-xs">{displayEmail}</span>
            <span className="text-muted truncate text-xs capitalize">
              {roleLabel}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]/sidebar:hidden" />
        </Button>
      }
    >
      {profileBlock}
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
    </Popover>
  );
}
