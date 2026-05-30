import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, Checkbox, FieldLabel, Input, Text } from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  createRole,
  patchRole,
  type TenantRoleRecord,
} from "../../lib/api-client";
import {
  FieldPermissionEditor,
  type FieldRuleDraft,
} from "./FieldPermissionEditor";

const BUILT_IN_ROLE_NAMES = new Set(["admin", "editor", "viewer"]);

interface RoleEditorProps {
  readonly role: TenantRoleRecord | null;
  readonly knownGrants: readonly string[];
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onSaved: (role: TenantRoleRecord) => void;
  readonly onCancel: () => void;
}

export function RoleEditor({
  role,
  knownGrants,
  canCreate,
  canUpdate,
  onSaved,
  onCancel,
}: RoleEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const isBuiltIn = role ? BUILT_IN_ROLE_NAMES.has(role.id) : false;
  const isCreate = role === null;

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [grants, setGrants] = useState<readonly string[]>(role?.grants ?? []);
  const [fieldRules, setFieldRules] = useState<readonly FieldRuleDraft[]>(
    role?.fieldRules ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const grantOptions = useMemo(() => {
    const values = new Set<string>([...knownGrants, ...grants, "*"]);
    return [...values].sort();
  }, [grants, knownGrants]);

  const toggleGrant = (grant: string) => {
    setGrants((current) =>
      current.includes(grant)
        ? current.filter((item) => item !== grant)
        : [...current, grant],
    );
  };

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    try {
      if (isCreate) {
        if (!canCreate) {
          throw new Error(t("roles.forbiddenCreate"));
        }
        const created = await createRole({
          name: name.trim(),
          description: description.trim() || undefined,
          grants,
          fieldRules: fieldRules.length > 0 ? fieldRules : undefined,
        });
        onSaved(created);
        return;
      }

      if (!role || !canUpdate) {
        throw new Error(t("roles.forbiddenUpdate"));
      }

      const updated = await patchRole(role.id, {
        description: description.trim() || undefined,
        ...(isBuiltIn ? {} : { grants }),
        fieldRules,
      });
      onSaved(updated);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("roles.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <Text>
        {isCreate
          ? t("roles.createTitle")
          : t("roles.editTitle", { name: role?.name })}
      </Text>
      {error ? <Alert>{error}</Alert> : null}

      {isCreate ? (
        <div className="space-y-1">
          <FieldLabel htmlFor="role-name">{t("roles.name")}</FieldLabel>
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <FieldLabel htmlFor="role-description">
          {t("roles.descriptionLabel")}
        </FieldLabel>
        <Input
          id="role-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      {!isBuiltIn || isCreate ? (
        <div className="space-y-2">
          <FieldLabel>{t("roles.grants")}</FieldLabel>
          <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border p-3 md:grid-cols-2">
            {grantOptions.map((grant) => (
              <Checkbox
                key={grant}
                id={`role-grant-${grant}`}
                label={grant}
                checked={grants.includes(grant)}
                disabled={isBuiltIn && !isCreate}
                onChange={() => toggleGrant(grant)}
              />
            ))}
          </div>
        </div>
      ) : (
        <Text>{t("roles.builtInGrantsLocked")}</Text>
      )}

      <div className="space-y-2">
        <FieldLabel>{t("roles.fieldPermissions")}</FieldLabel>
        <FieldPermissionEditor
          entities={entities}
          value={fieldRules}
          onChange={setFieldRules}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          loading={isSaving}
          onClick={() => void handleSave()}
        >
          {t("roles.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("roles.cancel")}
        </Button>
      </div>
    </div>
  );
}
