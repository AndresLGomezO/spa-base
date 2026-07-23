import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, type Location } from "react-router";

import { Alert, PageLoader, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";
import { usePermission } from "../auth/usePermission";
import { buildCurrentReturnTo, isSafeAppReturnTo } from "./entity-navigation";
import { NoTenantsEmptyState } from "./NoTenantsEmptyState";

interface GuardProps {
  readonly children: ReactNode;
}

const LOGIN_NEXT_PARAM = "next";

function buildLoginPath(
  location: Pick<Location, "pathname" | "search">,
): string {
  const returnTo = buildCurrentReturnTo(location);
  if (!isSafeAppReturnTo(returnTo) || returnTo === "/") {
    return "/login";
  }

  const params = new URLSearchParams();
  params.set(LOGIN_NEXT_PARAM, returnTo);
  return `/login?${params.toString()}`;
}

function resolvePostLoginRedirect(location: Pick<Location, "search">): string {
  const next = new URLSearchParams(location.search).get(LOGIN_NEXT_PARAM);
  if (next == null || next.length === 0) {
    return "/";
  }

  return isSafeAppReturnTo(next) ? next : "/";
}

export function RequireAuth({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginPath(location)} replace />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (isAuthenticated) {
    return <Navigate to={resolvePostLoginRedirect(location)} replace />;
  }

  return <>{children}</>;
}

export function RequireTenant({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, tenantId, availableTenants } = useAuth();

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (tenantId) {
    return <>{children}</>;
  }

  if (availableTenants.length > 0) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  return <NoTenantsEmptyState />;
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
