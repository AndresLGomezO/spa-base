import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";

import { Button, Popover, sidebarMenuButtonClassName } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../auth/AuthContext";
import { useCreateTenantModal } from "./platform/create-tenant-modal-context";

export function TenantSwitcher() {
  const { t } = useTranslation("common");
  const { openCreateTenantModal } = useCreateTenantModal();
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

  const activeLabel = tenantId ? tenantLabel(tenantId) : t("tenant.none");

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="right-start"
      title={t("tenant.selectTitle")}
      className="block w-full"
      trigger={
        <Button
          type="button"
          variant="ghost"
          fullWidth
          aria-label={activeLabel}
          className={cn(
            sidebarMenuButtonClassName(),
            "justify-start border-0 text-xs font-normal shadow-none focus-visible:ring-offset-0",
            open && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Building2
            className="size-4 shrink-0 group-data-[collapsible=icon]/sidebar:size-5"
            aria-hidden
          />
          <span className="truncate group-data-[collapsible=icon]/sidebar:sr-only">
            {activeLabel}
          </span>
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
            openCreateTenantModal();
          }}
        >
          {t("tenant.createNew")}
        </Button>
      </div>
    </Popover>
  );
}
