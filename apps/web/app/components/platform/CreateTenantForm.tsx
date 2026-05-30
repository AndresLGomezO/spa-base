import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Form, Input, toast } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { createAdminTenant } from "../../lib/admin-client";

interface CreateTenantFormProps {
  readonly onCancel: () => void;
  readonly onCreated?: (tenantId: string) => void;
}

export function CreateTenantForm({
  onCancel,
  onCreated,
}: CreateTenantFormProps) {
  const { t } = useTranslation("common");
  const { selectTenant } = useAuth();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    try {
      const tenant = await createAdminTenant({
        name: trimmedName,
        ...(id.trim() ? { id: id.trim() } : {}),
      });
      const result = await selectTenant(tenant.id);
      if (!result.success) {
        throw new Error(result.error ?? t("tenant.selectFailed"));
      }
      onCreated?.(tenant.id);
    } catch (createError) {
      toast.error(
        createError instanceof Error
          ? createError.message
          : t("admin.tenants.createFailed"),
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Form className="grid gap-4" onSubmit={(event) => void handleCreate(event)}>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="create-tenant-name">
          {t("admin.tenants.name")}
        </FieldLabel>
        <Input
          id="create-tenant-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="create-tenant-id">
          {t("admin.tenants.idOptional")}
        </FieldLabel>
        <Input
          id="create-tenant-id"
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder={t("admin.tenants.idPlaceholder")}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={isCreating}>
          {t("tenant.create")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("entity.cancel")}
        </Button>
      </div>
    </Form>
  );
}
