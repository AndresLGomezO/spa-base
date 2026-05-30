import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@repo/ui";

import type { TenantUserMember } from "../../lib/api-client";
import { FormModal } from "../forms/FormModal";
import { RoleSelect } from "./user-management-fields";

interface EditMemberModalProps {
  readonly open: boolean;
  readonly member: TenantUserMember | null;
  readonly roles: readonly string[];
  readonly isSaving: boolean;
  readonly canRemove: boolean;
  readonly onClose: () => void;
  readonly onSave: (payload: {
    readonly uid: string;
    readonly roles: string[];
  }) => void | Promise<void>;
  readonly onRemove: (uid: string) => void | Promise<void>;
}

export function EditMemberModal({
  open,
  member,
  roles,
  isSaving,
  canRemove,
  onClose,
  onSave,
  onRemove,
}: EditMemberModalProps) {
  const { t } = useTranslation("common");
  const [memberRoles, setMemberRoles] = useState<string[]>([]);

  useEffect(() => {
    setMemberRoles(member ? [...member.roles] : []);
  }, [member]);

  if (!member) {
    return null;
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t("userManagement.editUser")}
      size="md"
    >
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {member.email ?? member.uid}
        </p>
        <RoleSelect
          id="member-roles"
          roles={roles}
          value={memberRoles}
          onChange={setMemberRoles}
          label={t("userManagement.roles")}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void onSave({ uid: member.uid, roles: memberRoles })}
          >
            {isSaving ? t("loading") : t("userManagement.save")}
          </Button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={() => void onRemove(member.uid)}
            >
              {t("userManagement.remove")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {t("entity.cancel")}
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
