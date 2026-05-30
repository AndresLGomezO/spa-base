import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";

import { Alert, PageLoader, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";
import { usePermission } from "../auth/usePermission";

interface GuardProps {
  readonly children: ReactNode;
}

export function RequireAuth({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function RequireTenant({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, tenantId, availableTenants, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (tenantId) {
    return <>{children}</>;
  }

  if (isSuperAdmin) {
    if (availableTenants.length > 0) {
      return (
        <Navigate to="/select-tenant" replace state={{ from: location }} />
      );
    }

    return <>{children}</>;
  }

  if (availableTenants.length > 0) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Text>{t("tenant.noTenants")}</Text>
      <Alert>{t("tenant.noTenantsDetail")}</Alert>
    </div>
  );
}

interface PermissionGuardProps {
  readonly permission: string;
  readonly children: ReactNode;
}

export function PermissionGuard({
  permission,
  children,
}: PermissionGuardProps) {
  const { t } = useTranslation("common");
  const allowed = usePermission(permission);

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

export function RequireSuperAdmin({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isSuperAdmin } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Text>{t("admin.forbidden")}</Text>
        <Alert>{t("admin.forbiddenDetail")}</Alert>
      </div>
    );
  }

  return <>{children}</>;
}
