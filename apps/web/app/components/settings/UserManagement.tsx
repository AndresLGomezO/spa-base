import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Text, toast } from "@repo/ui";

import {
  createTenantUser,
  listRoles,
  listTenantUsers,
  removeTenantUser,
  updateTenantUserRoles,
  type TenantUserInvite,
  type TenantUserMember,
} from "../../lib/api-client";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { EditMemberModal } from "./EditMemberModal";
import { InviteUserModal } from "./InviteUserModal";

interface UserManagementProps {
  readonly tenantId: string;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
}

export function UserManagement({
  tenantId,
  canCreate,
  canUpdate,
  canRemove,
}: UserManagementProps) {
  const { t } = useTranslation("common");
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
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {canCreate ? (
          <Button type="button" onClick={() => setInviteOpen(true)}>
            {t("userManagement.addUser")}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3">{t("userManagement.email")}</th>
              <th className="px-4 py-3">{t("userManagement.roles")}</th>
              <th className="px-4 py-3">{t("userManagement.status")}</th>
              {canUpdate ? (
                <th className="px-4 py-3">{t("entity.actions")}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.uid} className="border-b last:border-b-0">
                <td className="px-4 py-3">{member.email ?? member.uid}</td>
                <td className="px-4 py-3">{member.roles.join(", ") || "—"}</td>
                <td className="px-4 py-3">{t("userManagement.active")}</td>
                {canUpdate ? (
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:underline h-auto px-0 py-0"
                      onClick={() => setEditingMember(member)}
                    >
                      {t("entity.edit")}
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{invite.email}</td>
                <td className="px-4 py-3">{invite.roles.join(", ")}</td>
                <td className="px-4 py-3">{t("userManagement.pending")}</td>
                {canUpdate ? <td className="px-4 py-3">—</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
