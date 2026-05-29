import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Form, Input, Text } from "@repo/ui";

import {
  createAdminTenant,
  listAdminTenants,
  updateAdminTenant,
  type AdminTenant,
} from "../../lib/admin-client";

export function TenantManager() {
  const { t } = useTranslation("common");
  const [tenants, setTenants] = useState<readonly AdminTenant[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingTenantId, setUpdatingTenantId] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextTenants = await listAdminTenants();
      setTenants(nextTenants);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("admin.tenants.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const tenant = await createAdminTenant({
        name: trimmedName,
        ...(id.trim() ? { id: id.trim() } : {}),
      });
      setTenants((current) =>
        [...current, tenant].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setName("");
      setId("");
      setSuccess(t("admin.tenants.createSuccess"));
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("admin.tenants.createFailed"),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleStatus(tenant: AdminTenant) {
    const nextStatus = tenant.status === "active" ? "suspended" : "active";

    setUpdatingTenantId(tenant.id);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateAdminTenant(tenant.id, {
        status: nextStatus,
      });
      setTenants((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
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
      setUpdatingTenantId(null);
    }
  }

  if (isLoading) {
    return <Text>{t("admin.tenants.loading")}</Text>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3">{t("admin.tenants.name")}</th>
              <th className="px-4 py-3">{t("admin.tenants.id")}</th>
              <th className="px-4 py-3">{t("admin.tenants.status")}</th>
              <th className="px-4 py-3">{t("admin.tenants.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{tenant.name}</td>
                <td className="px-4 py-3">{tenant.id}</td>
                <td className="px-4 py-3">
                  {tenant.status === "suspended"
                    ? t("tenant.suspended")
                    : t("admin.tenants.active")}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updatingTenantId !== null}
                    onClick={() => void handleToggleStatus(tenant)}
                  >
                    {updatingTenantId === tenant.id
                      ? t("loading")
                      : tenant.status === "active"
                        ? t("admin.tenants.suspend")
                        : t("admin.tenants.activate")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Form
        className="grid max-w-xl gap-4"
        onSubmit={(event) => void handleCreate(event)}
      >
        <HeadingSection title={t("tenant.create")} />

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

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="tenant-id">
            {t("admin.tenants.idOptional")}
          </FieldLabel>
          <Input
            id="tenant-id"
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder={t("admin.tenants.idPlaceholder")}
          />
        </div>

        <Button type="submit" disabled={isCreating}>
          {isCreating ? t("loading") : t("tenant.create")}
        </Button>
      </Form>
    </div>
  );
}

function HeadingSection({ title }: { readonly title: string }) {
  return <Text className="font-medium">{title}</Text>;
}
