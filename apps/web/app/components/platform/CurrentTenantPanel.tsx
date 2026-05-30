import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, toast } from "@repo/ui";

import {
  getAdminTenant,
  updateAdminTenant,
  type AdminTenant,
} from "../../lib/admin-client";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { EditTenantNameModal } from "./EditTenantNameModal";

interface CurrentTenantPanelProps {
  readonly tenantId: string;
}

export function CurrentTenantPanel({ tenantId }: CurrentTenantPanelProps) {
  const { t } = useTranslation("common");
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("platform.currentTenant.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  async function handleToggleStatus() {
    if (!tenant) return;
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenant.id, {
        status: nextStatus,
      });
      setTenant(updated);
      toast.success(
        nextStatus === "suspended"
          ? t("admin.tenants.suspendSuccess")
          : t("admin.tenants.activateSuccess"),
      );
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : t("admin.tenants.updateFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  if (!tenant) {
    return <Alert>{t("platform.currentTenant.notFound")}</Alert>;
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted font-medium">{t("admin.tenants.name")}</dt>
          <dd className="flex items-center gap-3">
            <span>{tenant.name}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              {t("entity.edit")}
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-muted font-medium">{t("admin.tenants.id")}</dt>
          <dd>{tenant.id}</dd>
        </div>
        <div>
          <dt className="text-muted font-medium">
            {t("admin.tenants.status")}
          </dt>
          <dd>
            {tenant.status === "suspended"
              ? t("tenant.suspended")
              : t("admin.tenants.active")}
          </dd>
        </div>
        <div>
          <dt className="text-muted font-medium">
            {t("platform.currentTenant.createdAt")}
          </dt>
          <dd>{new Date(tenant.createdAt).toLocaleString()}</dd>
        </div>
      </dl>

      <Button
        type="button"
        variant="outline"
        disabled={isSaving}
        onClick={() => void handleToggleStatus()}
      >
        {tenant.status === "active"
          ? t("admin.tenants.suspend")
          : t("admin.tenants.activate")}
      </Button>

      <EditTenantNameModal
        open={editOpen}
        tenant={tenant}
        onClose={() => setEditOpen(false)}
        onSaved={setTenant}
      />
    </div>
  );
}
