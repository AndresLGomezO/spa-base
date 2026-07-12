import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Heading, Text } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { getUserInitials } from "../../components/user/user-profile.utils";

export default function AccountSettingsProfileRoute() {
  const { t } = useTranslation("common");
  const { user, tenantRoleNames, isSuperAdmin } = useAuth();

  const displayName = useMemo(
    () =>
      user?.displayName ?? user?.email?.split("@")[0] ?? t("nav.fallbackName"),
    [t, user?.displayName, user?.email],
  );
  const displayEmail = user?.email ?? "";
  const initials = getUserInitials(displayName);
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Heading level={1}>{displayName}</Heading>
          <Text className="text-muted-foreground">{displayEmail}</Text>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Avatar
          src={user?.photoURL}
          alt={displayName}
          fallback={initials}
          size="lg"
        />
        <Text variant="caption" className="text-muted-foreground max-w-sm">
          {t("accountSettings.profile.managedByGoogle")}
        </Text>
      </div>

      <div className="border-border divide-border divide-y rounded-lg border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Text className="text-muted-foreground text-sm">
            {t("accountSettings.profile.name")}
          </Text>
          <Text className="truncate font-medium">{displayName}</Text>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Text className="text-muted-foreground text-sm">
            {t("accountSettings.profile.email")}
          </Text>
          <Text className="truncate font-medium">{displayEmail || "—"}</Text>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Text className="text-muted-foreground text-sm">
            {t("accountSettings.profile.roles")}
          </Text>
          <Text className="truncate font-medium capitalize">{roleLabel}</Text>
        </div>
      </div>
    </div>
  );
}
