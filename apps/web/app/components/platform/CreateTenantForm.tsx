import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Alert, Button, FieldLabel, Form, Input, Text } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { createAdminTenant } from "../../lib/admin-client";

export function CreateTenantForm() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { selectTenant } = useAuth();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsCreating(true);
    setError(null);
    try {
      const tenant = await createAdminTenant({
        name: trimmedName,
        ...(id.trim() ? { id: id.trim() } : {}),
      });
      const result = await selectTenant(tenant.id);
      if (!result.success) {
        throw new Error(result.error ?? t("tenant.selectFailed"));
      }
      navigate("/settings/tenant", { replace: true });
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("admin.tenants.createFailed"),
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Text>{t("platform.createTenant.description")}</Text>
      {error ? <Alert>{error}</Alert> : null}
      <Form
        className="grid gap-4"
        onSubmit={(event) => void handleCreate(event)}
      >
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
        <Button type="submit" disabled={isCreating}>
          {isCreating ? t("loading") : t("tenant.create")}
        </Button>
      </Form>
    </div>
  );
}
