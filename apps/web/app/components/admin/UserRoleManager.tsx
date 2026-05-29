import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Text } from "@repo/ui";

import {
  listAdminTenants,
  listAdminUsers,
  updateAdminUserAccess,
  type AdminTenant,
  type AdminUser,
} from "../../lib/admin-client";
import { listRoles } from "../../lib/api-client";

export function UserRoleManager() {
  const { t } = useTranslation("common");
  const [users, setUsers] = useState<readonly AdminUser[]>([]);
  const [roles, setRoles] = useState<readonly string[]>([]);
  const [tenants, setTenants] = useState<readonly AdminTenant[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [nextUsers, nextTenants] = await Promise.all([
        listAdminUsers(),
        listAdminTenants(),
      ]);
      setUsers(nextUsers);
      setTenants(nextTenants);
      setSelectedUserId((current) => current || nextUsers[0]?.uid || "");
      setSelectedTenantId((current) => current || nextTenants[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("admin.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedTenantId) {
      setRoles([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await listRoles({ tenantId: selectedTenantId });
        if (!cancelled) {
          setRoles(result.items.map((role) => role.name));
        }
      } catch {
        if (!cancelled) {
          setRoles([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  useEffect(() => {
    const user = users.find((item) => item.uid === selectedUserId);
    if (!user || !selectedTenantId) {
      setSelectedRoles([]);
      return;
    }

    setSelectedRoles([...(user.tenants[selectedTenantId] ?? [])]);
  }, [selectedTenantId, selectedUserId, users]);

  async function handleSave() {
    if (!selectedUserId || !selectedTenantId) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const user = users.find((item) => item.uid === selectedUserId);
      if (!user) {
        throw new Error(t("admin.userNotFound"));
      }

      const nextTenants: Record<string, string[]> = Object.fromEntries(
        Object.entries(user.tenants).map(([tenantId, roles]) => [
          tenantId,
          [...roles],
        ]),
      );
      nextTenants[selectedTenantId] = [...selectedRoles];

      const updated = await updateAdminUserAccess(selectedUserId, nextTenants);
      setUsers((current) =>
        current.map((item) => (item.uid === updated.uid ? updated : item)),
      );
      setSuccess(t("admin.saveSuccess"));
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("admin.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Text>{t("admin.loading")}</Text>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3">{t("admin.email")}</th>
              <th className="px-4 py-3">{t("admin.platformRole")}</th>
              <th className="px-4 py-3">{t("admin.tenantRoles")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid} className="border-b last:border-b-0">
                <td className="px-4 py-3">{user.email ?? user.uid}</td>
                <td className="px-4 py-3">{user.platformRole ?? "—"}</td>
                <td className="px-4 py-3">
                  {Object.entries(user.tenants)
                    .map(([tenantId, tenantRoles]) => {
                      const tenant = tenants.find(
                        (item) => item.id === tenantId,
                      );
                      const label = tenant?.name ?? tenantId;
                      return `${label}: ${tenantRoles.join(", ")}`;
                    })
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid max-w-xl gap-4">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="admin-user">{t("admin.user")}</FieldLabel>
          <select
            id="admin-user"
            className="border-border rounded-md border px-3 py-2"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.email ?? user.uid}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="admin-tenant">{t("admin.tenant")}</FieldLabel>
          <select
            id="admin-tenant"
            className="border-border rounded-md border px-3 py-2"
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.id})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="admin-roles">{t("admin.roles")}</FieldLabel>
          <select
            id="admin-roles"
            multiple
            className="border-border min-h-28 rounded-md border px-3 py-2"
            value={selectedRoles}
            onChange={(event) => {
              const values = Array.from(event.target.selectedOptions).map(
                (option) => option.value,
              );
              setSelectedRoles(values);
            }}
          >
            {roles.map((roleName) => (
              <option key={roleName} value={roleName}>
                {roleName}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
        >
          {isSaving ? t("loading") : t("admin.save")}
        </Button>
      </div>
    </div>
  );
}
