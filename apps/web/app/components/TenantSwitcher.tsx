import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Button, Popover } from "@repo/ui";

import { useAuth } from "../auth/AuthContext";

export function TenantSwitcher() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const {
    tenantId,
    availableTenants,
    tenantOptions,
    selectTenant,
    isSuperAdmin,
  } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isSuperAdmin) {
    return null;
  }

  function tenantLabel(id: string): string {
    const option = tenantOptions.find((item) => item.id === id);
    return option?.name ?? id;
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
          {tenantId ? tenantLabel(tenantId) : t("tenant.none")}
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
            {tenantLabel(id)}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="justify-start"
          onClick={() => {
            setOpen(false);
            navigate("/platform/create-tenant");
          }}
        >
          {t("tenant.createNew")}
        </Button>
      </div>
    </Popover>
  );
}
