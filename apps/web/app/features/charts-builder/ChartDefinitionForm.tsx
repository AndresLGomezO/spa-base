import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, Select, Text } from "@repo/ui";

import { ChartDefinitionRecipeEditor } from "../../components/charts/ChartDefinitionRecipeEditor.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context.js";
import { useCharts } from "./charts-context.js";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

export function ChartDefinitionForm() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useCharts();
  const { items, getDefinition } = useEntityCatalog();
  const draft = editor.draft;
  const readOnly = !canUpdate;

  const entityDefinition = useMemo(() => {
    const firstEntity = items[0];
    if (!firstEntity) {
      return undefined;
    }
    return getDefinition(firstEntity.name);
  }, [getDefinition, items]);

  const filterFieldOptions = useMemo(() => {
    if (!entityDefinition) {
      return [];
    }
    return Object.keys(entityDefinition.fields).filter(
      (field) => entityDefinition.fields[field]?.type !== "document",
    );
  }, [entityDefinition]);

  if (!draft || !entityDefinition) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <FieldLabel>{t("charts.workbench.fields.name")}</FieldLabel>
        <input
          className={controlClassName}
          value={draft.name}
          disabled={readOnly}
          onChange={(event) => editor.updateDraft({ name: event.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>{t("charts.workbench.fields.description")}</FieldLabel>
        <textarea
          className="border-input bg-background min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
          value={draft.description}
          disabled={readOnly}
          onChange={(event) =>
            editor.updateDraft({ description: event.target.value })
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <FieldLabel>{t("charts.workbench.fields.status")}</FieldLabel>
        <Select
          className={controlClassName}
          value={draft.status}
          disabled={readOnly}
          onChange={(event) =>
            editor.updateDraft({
              status: event.target.value as "ACTIVE" | "PAUSED",
            })
          }
        >
          <option value="ACTIVE">{t("charts.statusValues.ACTIVE")}</option>
          <option value="PAUSED">{t("charts.statusValues.PAUSED")}</option>
        </Select>
      </label>

      <ChartDefinitionRecipeEditor
        recipe={draft}
        entityDefinition={entityDefinition}
        filterFieldOptions={filterFieldOptions}
        onChange={(recipe) => editor.updateDraft(recipe)}
      />

      {readOnly ? (
        <Text className="text-muted-foreground text-sm">
          {t("charts.workbench.readOnlyHint")}
        </Text>
      ) : null}
    </div>
  );
}
