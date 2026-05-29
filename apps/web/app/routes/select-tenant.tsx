import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router";

import { Button, Heading, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";

export default function SelectTenantRoute() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const { availableTenants, selectTenant, tenantId } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submittingTenantId, setSubmittingTenantId] = useState<string | null>(
    null,
  );

  const fromPath =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "object" &&
    location.state.from !== null &&
    "pathname" in location.state.from &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : "/";

  if (tenantId) {
    return <Navigate to={fromPath} replace />;
  }

  async function handleSelect(nextTenantId: string) {
    setError(null);
    setSubmittingTenantId(nextTenantId);

    const result = await selectTenant(nextTenantId);
    setSubmittingTenantId(null);

    if (!result.success) {
      setError(result.error ?? t("tenant.selectFailed"));
      return;
    }

    navigate(fromPath, { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Heading level={1}>{t("tenant.selectTitle")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>

      {error ? <Text>{error}</Text> : null}

      <div className="flex flex-col gap-3">
        {availableTenants.map((id) => (
          <div
            key={id}
            className="border-border flex items-center justify-between gap-4 rounded-lg border p-4"
          >
            <Text>{id}</Text>
            <Button
              type="button"
              onClick={() => void handleSelect(id)}
              disabled={submittingTenantId !== null}
            >
              {submittingTenantId === id ? t("loading") : t("tenant.select")}
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
