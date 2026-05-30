import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Input } from "@repo/ui";

import { FormModal } from "../forms/FormModal";
import { RoleSelect } from "./user-management-fields";

interface InviteUserModalProps {
  readonly open: boolean;
  readonly roles: readonly string[];
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onInvite: (payload: {
    readonly email: string;
    readonly roles: string[];
  }) => void | Promise<void>;
}

export function InviteUserModal({
  open,
  roles,
  isSaving,
  onClose,
  onInvite,
}: InviteUserModalProps) {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["viewer"]);

  function handleClose() {
    setEmail("");
    setSelectedRoles(["viewer"]);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={t("userManagement.addUser")}
      size="md"
    >
      <div className="grid gap-4">
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
        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void onInvite({ email: email.trim(), roles: selectedRoles })
            }
          >
            {isSaving ? t("loading") : t("userManagement.addUser")}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t("entity.cancel")}
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
