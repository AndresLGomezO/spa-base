import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Popover, Text } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";

export function TenantSwitcher() {
  const { t } = useTranslation("common");
  const { tenantId, availableTenants, selectTenant } = useAuth();
  const [open, setOpen] = useState(false);

  if (availableTenants.length <= 1) {
    return tenantId ? (
      <Text className="text-muted-foreground truncate px-2 text-xs">
        {t("tenant.currentTenant", { tenant: tenantId })}
      </Text>
    ) : null;
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="top-start"
      className="block w-full"
      trigger={
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start truncate px-2 text-xs"
        >
          {t("tenant.switchTenant")}: {tenantId ?? t("tenant.none")}
        </Button>
      }
    >
      <div className="flex min-w-40 flex-col gap-1">
        {availableTenants.map((id) => (
          <Button
            key={id}
            type="button"
            variant={id === tenantId ? "outline" : "ghost"}
            className="justify-start"
            onClick={() => {
              void selectTenant(id);
              setOpen(false);
            }}
          >
            {id}
          </Button>
        ))}
      </div>
    </Popover>
  );
}
