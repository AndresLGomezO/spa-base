import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router";

import { Text } from "@repo/ui";

import { useAuth } from "./AuthContext";

interface GuardProps {
  readonly children: ReactNode;
}

export function RequireAuth({ children }: GuardProps) {
  const { t } = useTranslation("common");
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <Text>{t("loading")}</Text>;
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
    return <Text>{t("loading")}</Text>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
