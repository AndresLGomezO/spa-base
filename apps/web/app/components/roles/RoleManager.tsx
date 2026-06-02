import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  DataTable,
  FieldLabel,
  IconButton,
  Text,
  toast,
} from "@repo/ui";
import { Pencil } from "lucide-react";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useDataViewWithPagination } from "@repo/data-view";
import { listRoles, type TenantRoleRecord } from "../../lib/api-client";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";
import { FormModal } from "../forms/FormModal";
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
  const paginationLabels = useTablePaginationLabels();
  const { items: entities } = useEntityCatalog();
  const [items, setItems] = useState<readonly TenantRoleRecord[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const columns = useMemo<
    readonly DataViewColumnDescriptor<TenantRoleRecord>[]
  >(
    () => [
      {
        id: "name",
        label: t("roles.name"),
        getValue: (role) => role.name,
      },
      {
        id: "grants",
        label: t("roles.grantCount"),
        getValue: (role) => role.grants.length,
        filterable: false,
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(items, columns);

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
      "entityUiOverride.read",
      "entityUiOverride.update",
      "internalEntity.read",
      "entityCategory.read",
      "entityCategory.create",
      "entityCategory.update",
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

  const editingRole =
    editingRoleId === null
      ? null
      : (items.find((item) => item.id === editingRoleId) ?? null);

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

  function closeModal() {
    setIsCreating(false);
    setEditingRoleId(null);
  }

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
    closeModal();
  }

  const modalOpen = isCreating || editingRoleId !== null;
  const modalTitle = useMemo(() => {
    if (isCreating) {
      return t("roles.createTitle");
    }
    return t("roles.editTitle", { name: editingRole?.name ?? "" });
  }, [editingRole?.name, isCreating, t]);

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  return (
    <div className="flex min-h-full flex-col gap-6">
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
              setEditingRoleId(null);
            }}
          >
            {t("roles.create")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Text>{t("roles.selectRole")}</Text>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <WebDataViewToolbar
            {...dataView}
            columns={columns}
            filtersOpen={dataView.filtersOpen}
            onFiltersOpenChange={dataView.setFiltersOpen}
          />

          <DataTable
            columns={[
              {
                id: "name",
                header: t("roles.name"),
                cell: (role) => role.name,
              },
              {
                id: "grants",
                header: t("roles.grantCount"),
                cell: (role) => role.grants.length,
              },
            ]}
            rows={dataView.pageItems}
            getRowId={(role) => role.id}
            page={dataView.page}
            totalCount={dataView.totalCount}
            onPageChange={dataView.setPage}
            emptyMessage={t("roles.selectRole")}
            loadingMessage={t("table.loading")}
            paginationLabels={paginationLabels}
            actionsColumn={
              canUpdate
                ? {
                    id: "actions",
                    header: t("entity.actions"),
                    headerClassName: "text-center",
                    cell: (role) => (
                      <IconButton
                        type="button"
                        label={t("entity.edit")}
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setIsCreating(false);
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                    ),
                  }
                : undefined
            }
          />
        </div>
      )}

      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        {modalOpen ? (
          <RoleEditor
            key={isCreating ? "create" : (editingRoleId ?? "edit")}
            role={isCreating ? null : editingRole}
            knownGrants={knownGrants}
            canCreate={canCreate}
            canUpdate={canUpdate}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        ) : null}
      </FormModal>
    </div>
  );
}
