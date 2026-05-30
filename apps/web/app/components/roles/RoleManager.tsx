import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Text, toast } from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { listRoles, type TenantRoleRecord } from "../../lib/api-client";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { RoleEditor } from "./RoleEditor";

interface RoleManagerProps {
  readonly tenantId: string;
  readonly canCreate?: boolean;
  readonly canUpdate?: boolean;
  readonly showTenantPicker?: boolean;
  readonly tenantOptions?: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly onTenantChange?: (tenantId: string) => void;
}

export function RoleManager({
  tenantId,
  canCreate = true,
  canUpdate = true,
  showTenantPicker = false,
  tenantOptions = [],
  onTenantChange,
}: RoleManagerProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const [items, setItems] = useState<readonly TenantRoleRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const knownGrants = useMemo(() => {
    const grants = new Set<string>([
      "*",
      "*.read",
      "*.create",
      "*.update",
      "*.delete",
      "role.read",
      "role.create",
      "role.update",
      "entityDefinition.read",
      "entityDefinition.create",
      "entityDefinition.update",
      "hook.read",
      "hook.create",
      "hook.update",
    ]);

    for (const entity of entities) {
      for (const permission of entity.permissions) {
        grants.add(permission);
      }
      grants.add(`${entity.name}.*`);
    }

    return [...grants].sort();
  }, [entities]);

  const selectedRole =
    selectedRoleId === null
      ? null
      : (items.find((item) => item.id === selectedRoleId) ?? null);

  const loadRoles = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listRoles();
      setItems(result.items);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error ? loadError.message : t("roles.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  function handleSaved(role: TenantRoleRecord) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === role.id);
      if (index === -1) {
        return [...current, role].sort((left, right) =>
          left.name.localeCompare(right.name),
        );
      }
      return current.map((item) => (item.id === role.id ? role : item));
    });
    setSelectedRoleId(role.id);
    setIsCreating(false);
  }

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  return (
    <div className="space-y-6">
      {showTenantPicker ? (
        <div className="max-w-md">
          <FieldLabel htmlFor="role-tenant">{t("roles.tenant")}</FieldLabel>
          <select
            id="role-tenant"
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={tenantId}
            onChange={(event) => onTenantChange?.(event.target.value)}
          >
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        {canCreate ? (
          <Button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setSelectedRoleId(null);
            }}
          >
            {t("roles.create")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          {items.map((role) => (
            <Button
              key={role.id}
              type="button"
              variant={selectedRoleId === role.id ? "primary" : "outline"}
              className="w-full justify-start"
              onClick={() => {
                setSelectedRoleId(role.id);
                setIsCreating(false);
              }}
            >
              {role.name}
            </Button>
          ))}
        </div>

        {isCreating || selectedRole ? (
          <RoleEditor
            role={isCreating ? null : selectedRole}
            knownGrants={knownGrants}
            canCreate={canCreate}
            canUpdate={canUpdate}
            onSaved={handleSaved}
            onCancel={() => {
              setIsCreating(false);
              setSelectedRoleId(null);
            }}
          />
        ) : (
          <Text>{t("roles.selectRole")}</Text>
        )}
      </div>
    </div>
  );
}
