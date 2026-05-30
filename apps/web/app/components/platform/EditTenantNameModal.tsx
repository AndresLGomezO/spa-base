import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Form, Input, toast } from "@repo/ui";

import { updateAdminTenant, type AdminTenant } from "../../lib/admin-client";
import { FormModal } from "../forms/FormModal";

interface EditTenantNameModalProps {
  readonly open: boolean;
  readonly tenant: AdminTenant;
  readonly onClose: () => void;
  readonly onSaved: (tenant: AdminTenant) => void;
}

export function EditTenantNameModal({
  open,
  tenant,
  onClose,
  onSaved,
}: EditTenantNameModalProps) {
  const { t } = useTranslation("common");
  const [name, setName] = useState(tenant.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(tenant.name);
  }, [tenant.name]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenant.id, { name: trimmedName });
      onSaved(updated);
      toast.success(t("platform.currentTenant.saveSuccess"));
      onClose();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("platform.currentTenant.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t("platform.currentTenant.editName")}
      size="md"
      scrollable={false}
    >
      <Form className="grid gap-4" onSubmit={(event) => void handleSave(event)}>
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
        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSaving}>
            {t("platform.currentTenant.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("entity.cancel")}
          </Button>
        </div>
      </Form>
    </FormModal>
  );
}
