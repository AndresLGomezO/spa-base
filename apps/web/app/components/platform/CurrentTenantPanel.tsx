import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Form, Input } from "@repo/ui";

import {
  getAdminTenant,
  updateAdminTenant,
  type AdminTenant,
} from "../../lib/admin-client";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";

interface CurrentTenantPanelProps {
  readonly tenantId: string;
}

export function CurrentTenantPanel({ tenantId }: CurrentTenantPanelProps) {
  const { t } = useTranslation("common");
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
      setName(nextTenant.name);
    } catch (loadError) {
      setError(
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

  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !tenant) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminTenant(tenant.id, { name: trimmedName });
      setTenant(updated);
      setSuccess(t("platform.currentTenant.saveSuccess"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("platform.currentTenant.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!tenant) return;
    const nextStatus = tenant.status === "active" ? "suspended" : "active";
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminTenant(tenant.id, {
        status: nextStatus,
      });
      setTenant(updated);
      setSuccess(
        nextStatus === "suspended"
          ? t("admin.tenants.suspendSuccess")
          : t("admin.tenants.activateSuccess"),
      );
    } catch (updateError) {
      setError(
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
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <dl className="grid gap-3 text-sm">
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

      <Form
        className="grid gap-4"
        onSubmit={(event) => void handleSaveName(event)}
      >
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tenant-name">
            {t("admin.tenants.name")}
          </FieldLabel>
          <Input
            id="tenant-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("loading") : t("platform.currentTenant.save")}
        </Button>
      </Form>

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
    </div>
  );
}
