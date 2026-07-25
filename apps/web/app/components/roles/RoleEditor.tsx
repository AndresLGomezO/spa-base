import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Checkbox, FieldLabel, Input, Text, toast } from "@repo/ui";

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
  const [monthlyInputTokens, setMonthlyInputTokens] = useState(
    role?.aiSpendLimits?.monthlyInputTokens != null
      ? String(role.aiSpendLimits.monthlyInputTokens)
      : "",
  );
  const [monthlyOutputTokens, setMonthlyOutputTokens] = useState(
    role?.aiSpendLimits?.monthlyOutputTokens != null
      ? String(role.aiSpendLimits.monthlyOutputTokens)
      : "",
  );
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState(
    role?.aiSpendLimits?.monthlyBudgetUsd != null
      ? String(role.aiSpendLimits.monthlyBudgetUsd)
      : "",
  );
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
    setIsSaving(true);

    const parseOptional = (raw: string): number | undefined | null => {
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      const value = Number(trimmed);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(t("roles.saveFailed"));
      }
      return value;
    };

    try {
      const inputTokens = parseOptional(monthlyInputTokens);
      const outputTokens = parseOptional(monthlyOutputTokens);
      const budgetUsd = parseOptional(monthlyBudgetUsd);
      const aiSpendLimits =
        inputTokens == null && outputTokens == null && budgetUsd == null
          ? null
          : {
              ...(inputTokens != null
                ? { monthlyInputTokens: inputTokens }
                : {}),
              ...(outputTokens != null
                ? { monthlyOutputTokens: outputTokens }
                : {}),
              ...(budgetUsd != null ? { monthlyBudgetUsd: budgetUsd } : {}),
            };

      if (isCreate) {
        if (!canCreate) {
          throw new Error(t("roles.forbiddenCreate"));
        }
        const created = await createRole({
          name: name.trim(),
          description: description.trim() || undefined,
          grants,
          fieldRules: fieldRules.length > 0 ? fieldRules : undefined,
          ...(aiSpendLimits ? { aiSpendLimits } : {}),
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
        aiSpendLimits,
      });
      onSaved(updated);
    } catch (saveError) {
      toast.error(
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
          <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border px-4 py-3 md:grid-cols-2">
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

      <div className="space-y-2">
        <FieldLabel>{t("aiSpend.roleLimitsTitle")}</FieldLabel>
        <Text className="text-muted-foreground text-sm">
          {t("aiSpend.roleLimitsHelp")}
        </Text>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <FieldLabel htmlFor="role-ai-input-tokens">
              {t("aiSpend.monthlyInputTokens")}
            </FieldLabel>
            <Input
              id="role-ai-input-tokens"
              inputMode="numeric"
              placeholder={t("aiSpend.unlimitedPlaceholder")}
              value={monthlyInputTokens}
              onChange={(event) => setMonthlyInputTokens(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="role-ai-output-tokens">
              {t("aiSpend.monthlyOutputTokens")}
            </FieldLabel>
            <Input
              id="role-ai-output-tokens"
              inputMode="numeric"
              placeholder={t("aiSpend.unlimitedPlaceholder")}
              value={monthlyOutputTokens}
              onChange={(event) => setMonthlyOutputTokens(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="role-ai-budget-usd">
              {t("aiSpend.monthlyBudgetUsd")}
            </FieldLabel>
            <Input
              id="role-ai-budget-usd"
              inputMode="decimal"
              placeholder={t("aiSpend.unlimitedPlaceholder")}
              value={monthlyBudgetUsd}
              onChange={(event) => setMonthlyBudgetUsd(event.target.value)}
            />
          </div>
        </div>
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
