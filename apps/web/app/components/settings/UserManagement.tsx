import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, DataTable, IconButton, Text, toast } from "@repo/ui";
import { Pencil } from "lucide-react";

import {
  createTenantUser,
  listRoles,
  listTenantUsers,
  removeTenantUser,
  updateTenantUserRoles,
  type TenantUserInvite,
  type TenantUserMember,
} from "../../lib/api-client";
import { useDataViewWithPagination } from "@repo/data-view";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { EditMemberModal } from "./EditMemberModal";
import { InviteUserModal } from "./InviteUserModal";

interface UserManagementProps {
  readonly tenantId: string;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
}

type UserTableRow =
  | {
      readonly kind: "member";
      readonly id: string;
      readonly email: string;
      readonly roles: readonly string[];
      readonly statusLabel: string;
      readonly member: TenantUserMember;
    }
  | {
      readonly kind: "invite";
      readonly id: string;
      readonly email: string;
      readonly roles: readonly string[];
      readonly statusLabel: string;
    };

export function UserManagement({
  tenantId,
  canCreate,
  canUpdate,
  canRemove,
}: UserManagementProps) {
  const { t } = useTranslation("common");
  const paginationLabels = useTablePaginationLabels();
  const [members, setMembers] = useState<readonly TenantUserMember[]>([]);
  const [invites, setInvites] = useState<readonly TenantUserInvite[]>([]);
  const [roles, setRoles] = useState<readonly string[]>([]);
  const [editingMember, setEditingMember] = useState<TenantUserMember | null>(
    null,
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.all([
        listTenantUsers(),
        listRoles(),
      ]);
      setMembers(usersResult.members);
      setInvites(usersResult.invites);
      setRoles(rolesResult.items.map((role) => role.name));
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("userManagement.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const allRows = useMemo<readonly UserTableRow[]>(() => {
    const memberRows: UserTableRow[] = members.map((member) => ({
      kind: "member",
      id: member.uid,
      email: member.email ?? member.uid,
      roles: member.roles,
      statusLabel: t("userManagement.active"),
      member,
    }));
    const inviteRows: UserTableRow[] = invites.map((invite) => ({
      kind: "invite",
      id: invite.id,
      email: invite.email,
      roles: invite.roles,
      statusLabel: t("userManagement.pending"),
    }));
    return [...memberRows, ...inviteRows];
  }, [invites, members, t]);

  const columns = useMemo<readonly DataViewColumnDescriptor<UserTableRow>[]>(
    () => [
      {
        id: "email",
        label: t("userManagement.email"),
        getValue: (row) => row.email,
      },
      {
        id: "roles",
        label: t("userManagement.roles"),
        getValue: (row) => row.roles,
        formatValue: (value) =>
          Array.isArray(value) ? value.join(", ") : String(value ?? ""),
      },
      {
        id: "status",
        label: t("userManagement.status"),
        getValue: (row) => row.statusLabel,
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(allRows, columns);

  async function handleInvite(payload: {
    readonly email: string;
    readonly roles: string[];
  }) {
    if (!payload.email) return;
    setIsSaving(true);
    try {
      await createTenantUser({
        email: payload.email,
        roles: payload.roles,
      });
      toast.success(t("userManagement.inviteSuccess"));
      setInviteOpen(false);
      await loadData();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("userManagement.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateMember(payload: {
    readonly uid: string;
    readonly roles: string[];
  }) {
    setIsSaving(true);
    try {
      await updateTenantUserRoles(payload.uid, payload.roles);
      toast.success(t("userManagement.saveSuccess"));
      setEditingMember(null);
      await loadData();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("userManagement.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveMember(uid: string) {
    setIsSaving(true);
    try {
      await removeTenantUser(uid);
      toast.success(t("userManagement.removeSuccess"));
      setEditingMember(null);
      await loadData();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("userManagement.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!tenantId) {
    return <Text>{t("tenant.selectDescription")}</Text>;
  }

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {canCreate ? (
          <Button type="button" onClick={() => setInviteOpen(true)}>
            {t("userManagement.addUser")}
          </Button>
        ) : null}
      </div>

      <WebDataViewToolbar
        {...dataView}
        columns={columns}
        filtersOpen={dataView.filtersOpen}
        onFiltersOpenChange={dataView.setFiltersOpen}
      />

      <DataTable
        columns={[
          {
            id: "email",
            header: t("userManagement.email"),
            cell: (row) => row.email,
          },
          {
            id: "roles",
            header: t("userManagement.roles"),
            cell: (row) => row.roles.join(", ") || "—",
          },
          {
            id: "status",
            header: t("userManagement.status"),
            cell: (row) => row.statusLabel,
          },
        ]}
        rows={dataView.pageItems}
        getRowId={(row) => row.id}
        page={dataView.page}
        totalCount={dataView.totalCount}
        onPageChange={dataView.setPage}
        isLoading={isLoading}
        emptyMessage={t("userManagement.empty")}
        loadingMessage={t("table.loading")}
        paginationLabels={paginationLabels}
        actionsColumn={
          canUpdate
            ? {
                id: "actions",
                header: t("entity.actions"),
                headerClassName: "text-center",
                cell: (row) =>
                  row.kind === "member" ? (
                    <IconButton
                      type="button"
                      label={t("entity.edit")}
                      onClick={() => setEditingMember(row.member)}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                  ) : (
                    "—"
                  ),
              }
            : undefined
        }
      />

      <InviteUserModal
        open={inviteOpen}
        roles={roles}
        isSaving={isSaving}
        onClose={() => setInviteOpen(false)}
        onInvite={handleInvite}
      />

      <EditMemberModal
        open={editingMember !== null}
        member={editingMember}
        roles={roles}
        isSaving={isSaving}
        canRemove={canRemove}
        onClose={() => setEditingMember(null)}
        onSave={handleUpdateMember}
        onRemove={handleRemoveMember}
      />
    </div>
  );
}
