import type { ReactNode } from "react";
import { Alert, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { type EntityName } from "../../entities/entity-catalog";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";

interface RequireEntityPermissionProps {
  readonly entityName: EntityName;
  readonly action?: "read" | "create" | "update";
  readonly children: ReactNode;
}

export function RequireEntityPermission({
  entityName,
  action = "read",
  children,
}: RequireEntityPermissionProps) {
  const { t } = useTranslation("common");
  const permissions = useEntityPermissions(entityName);
  const allowed =
    action === "create"
      ? permissions.canCreate
      : action === "update"
        ? permissions.canUpdate
        : permissions.canRead;

  if (!allowed) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Text>{t("entity.forbidden")}</Text>
        <Alert>{t("entity.forbiddenDetail")}</Alert>
      </div>
    );
  }

  return <>{children}</>;
}
