import { useTranslation } from "react-i18next";
import { Button, Heading, Text, toast } from "@repo/ui";
import { Check } from "lucide-react";

import { useAuth } from "../../auth/AuthContext";

export default function AccountSettingsTenantsRoute() {
  const { t } = useTranslation("common");
  const { tenantId, availableTenants, tenantOptions, selectTenant } = useAuth();

  function tenantLabel(id: string): string {
    const option = tenantOptions.find((item) => item.id === id);
    return option?.name ?? id;
  }

  async function handleSelect(id: string) {
    if (id === tenantId) return;
    try {
      await selectTenant(id);
      toast.success(
        t("accountSettings.tenants.switched", { name: tenantLabel(id) }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("accountSettings.tenants.switchFailed"),
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Heading level={1}>{t("accountSettings.tenants.title")}</Heading>
        <Text className="text-muted-foreground">
          {t("accountSettings.tenants.description")}
        </Text>
      </div>

      {availableTenants.length === 0 ? (
        <Text>{t("accountSettings.tenants.empty")}</Text>
      ) : (
        <ul className="border-border divide-border divide-y rounded-lg border">
          {availableTenants.map((id) => {
            const active = id === tenantId;
            return (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <Text className="truncate font-medium">
                    {tenantLabel(id)}
                  </Text>
                  <Text variant="caption" className="truncate">
                    {id}
                  </Text>
                </div>
                {active ? (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                    <Check className="size-4" aria-hidden />
                    {t("accountSettings.tenants.active")}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSelect(id)}
                  >
                    {t("accountSettings.tenants.switch")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
