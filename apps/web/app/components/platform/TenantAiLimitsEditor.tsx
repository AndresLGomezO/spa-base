import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Input, Text, toast } from "@repo/ui";

import { updateAdminTenant, type AdminTenant } from "../../lib/admin-client";

function optionalNumberToInput(value: number | undefined): string {
  return value == null ? "" : String(value);
}

function parseOptionalNonNegative(raw: string): number | undefined | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return "invalid";
  return parsed;
}

interface TenantAiLimitsEditorProps {
  readonly tenant: AdminTenant;
  readonly onSaved: (tenant: AdminTenant) => void;
}

export function TenantAiLimitsEditor({
  tenant,
  onSaved,
}: TenantAiLimitsEditorProps) {
  const { t } = useTranslation("common");
  const [inputTokens, setInputTokens] = useState(
    optionalNumberToInput(tenant.aiLimits?.monthlyInputTokens),
  );
  const [outputTokens, setOutputTokens] = useState(
    optionalNumberToInput(tenant.aiLimits?.monthlyOutputTokens),
  );
  const [budgetUsd, setBudgetUsd] = useState(
    optionalNumberToInput(tenant.aiLimits?.monthlyBudgetUsd),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputTokens(optionalNumberToInput(tenant.aiLimits?.monthlyInputTokens));
    setOutputTokens(
      optionalNumberToInput(tenant.aiLimits?.monthlyOutputTokens),
    );
    setBudgetUsd(optionalNumberToInput(tenant.aiLimits?.monthlyBudgetUsd));
  }, [tenant]);

  async function handleSave() {
    const monthlyInputTokens = parseOptionalNonNegative(inputTokens);
    const monthlyOutputTokens = parseOptionalNonNegative(outputTokens);
    const monthlyBudgetUsd = parseOptionalNonNegative(budgetUsd);
    if (
      monthlyInputTokens === "invalid" ||
      monthlyOutputTokens === "invalid" ||
      monthlyBudgetUsd === "invalid"
    ) {
      toast.error(t("aiSpend.limitsSaveFailed"));
      return;
    }

    const aiLimits =
      monthlyInputTokens == null &&
      monthlyOutputTokens == null &&
      monthlyBudgetUsd == null
        ? null
        : {
            ...(monthlyInputTokens != null ? { monthlyInputTokens } : {}),
            ...(monthlyOutputTokens != null ? { monthlyOutputTokens } : {}),
            ...(monthlyBudgetUsd != null ? { monthlyBudgetUsd } : {}),
          };

    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenant.id, { aiLimits });
      onSaved(updated);
      toast.success(t("aiSpend.limitsSaved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("aiSpend.limitsSaveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="space-y-1">
        <Text className="font-medium">{t("aiSpend.tenantLimitsTitle")}</Text>
        <Text className="text-muted-foreground text-sm">
          {t("aiSpend.tenantLimitsDescription")}
        </Text>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <FieldLabel htmlFor="tenant-ai-input-tokens">
            {t("aiSpend.monthlyInputTokens")}
          </FieldLabel>
          <Input
            id="tenant-ai-input-tokens"
            inputMode="numeric"
            placeholder={t("aiSpend.unlimitedPlaceholder")}
            value={inputTokens}
            onChange={(event) => setInputTokens(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="tenant-ai-output-tokens">
            {t("aiSpend.monthlyOutputTokens")}
          </FieldLabel>
          <Input
            id="tenant-ai-output-tokens"
            inputMode="numeric"
            placeholder={t("aiSpend.unlimitedPlaceholder")}
            value={outputTokens}
            onChange={(event) => setOutputTokens(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="tenant-ai-budget-usd">
            {t("aiSpend.monthlyBudgetUsd")}
          </FieldLabel>
          <Input
            id="tenant-ai-budget-usd"
            inputMode="decimal"
            placeholder={t("aiSpend.unlimitedPlaceholder")}
            value={budgetUsd}
            onChange={(event) => setBudgetUsd(event.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        loading={isSaving}
        onClick={() => void handleSave()}
      >
        {t("aiSpend.saveLimits")}
      </Button>
    </div>
  );
}
