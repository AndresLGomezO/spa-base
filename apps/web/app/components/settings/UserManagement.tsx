import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Input, Text } from "@repo/ui";

import {
  createTenantUser,
  listRoles,
  listTenantUsers,
  removeTenantUser,
  updateTenantUserRoles,
  type TenantUserInvite,
  type TenantUserMember,
} from "../../lib/api-client";

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
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["viewer"]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberRoles, setMemberRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [usersResult, rolesResult] = await Promise.all([
        listTenantUsers(),
        listRoles(),
      ]);
      setMembers(usersResult.members);
      setInvites(usersResult.invites);
      setRoles(rolesResult.items.map((role) => role.name));
      setSelectedMemberId(
        (current) => current || usersResult.members[0]?.uid || "",
      );
    } catch (loadError) {
      setError(
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

  useEffect(() => {
    const member = members.find((item) => item.uid === selectedMemberId);
    setMemberRoles(member ? [...member.roles] : []);
  }, [members, selectedMemberId]);

  async function handleInvite() {
    if (!email.trim()) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createTenantUser({ email: email.trim(), roles: selectedRoles });
      setEmail("");
      setSuccess(t("userManagement.inviteSuccess"));
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("userManagement.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateMember() {
    if (!selectedMemberId) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateTenantUserRoles(selectedMemberId, memberRoles);
      setSuccess(t("userManagement.saveSuccess"));
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("userManagement.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveMember() {
    if (!selectedMemberId) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await removeTenantUser(selectedMemberId);
      setSelectedMemberId("");
      setSuccess(t("userManagement.removeSuccess"));
      await loadData();
    } catch (saveError) {
      setError(
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
    return <Text>{t("loading")}</Text>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-3">{t("userManagement.email")}</th>
              <th className="px-4 py-3">{t("userManagement.roles")}</th>
              <th className="px-4 py-3">{t("userManagement.status")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.uid} className="border-b last:border-b-0">
                <td className="px-4 py-3">{member.email ?? member.uid}</td>
                <td className="px-4 py-3">{member.roles.join(", ") || "—"}</td>
                <td className="px-4 py-3">{t("userManagement.active")}</td>
              </tr>
            ))}
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{invite.email}</td>
                <td className="px-4 py-3">{invite.roles.join(", ")}</td>
                <td className="px-4 py-3">{t("userManagement.pending")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canCreate ? (
        <div className="grid max-w-xl gap-4">
          <HeadingBlock title={t("userManagement.addUser")} />
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="invite-email">
              {t("userManagement.email")}
            </FieldLabel>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <RoleSelect
            id="invite-roles"
            roles={roles}
            value={selectedRoles}
            onChange={setSelectedRoles}
            label={t("userManagement.roles")}
          />
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleInvite()}
          >
            {isSaving ? t("loading") : t("userManagement.addUser")}
          </Button>
        </div>
      ) : null}

      {canUpdate ? (
        <div className="grid max-w-xl gap-4">
          <HeadingBlock title={t("userManagement.editUser")} />
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="member-select">
              {t("userManagement.member")}
            </FieldLabel>
            <select
              id="member-select"
              className="border-border rounded-md border px-3 py-2"
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.uid} value={member.uid}>
                  {member.email ?? member.uid}
                </option>
              ))}
            </select>
          </div>
          <RoleSelect
            id="member-roles"
            roles={roles}
            value={memberRoles}
            onChange={setMemberRoles}
            label={t("userManagement.roles")}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={isSaving || !selectedMemberId}
              onClick={() => void handleUpdateMember()}
            >
              {isSaving ? t("loading") : t("userManagement.save")}
            </Button>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving || !selectedMemberId}
                onClick={() => void handleRemoveMember()}
              >
                {t("userManagement.remove")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeadingBlock({ title }: { readonly title: string }) {
  return <Text className="font-medium">{title}</Text>;
}

function RoleSelect(props: {
  readonly id: string;
  readonly label: string;
  readonly roles: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (roles: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
      <select
        id={props.id}
        multiple
        className="border-border min-h-28 rounded-md border px-3 py-2"
        value={[...props.value]}
        onChange={(event) => {
          const values = Array.from(event.target.selectedOptions).map(
            (option) => option.value,
          );
          props.onChange(values);
        }}
      >
        {props.roles.map((roleName) => (
          <option key={roleName} value={roleName}>
            {roleName}
          </option>
        ))}
      </select>
    </div>
  );
}
