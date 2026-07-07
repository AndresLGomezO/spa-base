import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { metricDefinitionFormJsonLabels } from "../../components/metrics/json/metric-definition-json-labels";
import { MetricDefinitionJsonToolbar } from "../../components/metrics/json/MetricDefinitionJsonToolbar";
import type { MetricFormStateImportResult } from "../../components/metrics/json/export-metric-form-state";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { MetricAggregatedDefinitionForm } from "../../components/metrics/MetricAggregatedDefinitionForm";
import { MetricComputedDefinitionForm } from "../../components/metrics/MetricComputedDefinitionForm";
import { useMetrics } from "./metrics-context";
import {
  listEntityQueryDefinitions,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

export function MetricSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useMetrics();
  const jsonLabels = useMemo(() => metricDefinitionFormJsonLabels(t), [t]);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;
  const readOnly = !canUpdate;
  const [queryDefinitions, setQueryDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    void listEntityQueryDefinitions()
      .then((result) => {
        if (!cancelled) {
          setQueryDefinitions(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQueryDefinitions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!definition || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("metrics.workbench.settings.empty")}
        </Text>
      </div>
    );
  }

  const modeLabel =
    draft.computationMode === "computed"
      ? t("metrics.workbench.list.modeComputed")
      : t("metrics.workbench.list.modeAggregated");
  const sourceLabel = draft.sourceQueryDefinitionId
    ? t("metrics.sourceTypes.query")
    : t("metrics.sourceTypes.entity");

  function handleJsonImport(imported: MetricFormStateImportResult) {
    editor.updateDraft({
      name: imported.name,
      description: imported.description,
      computationMode: imported.computationMode,
      sourceModel: imported.sourceModel,
      sourceType: imported.sourceType,
      sourceQueryDefinitionId: imported.sourceQueryDefinitionId,
      status: imported.status,
      aggregationOperation: imported.aggregationOperation,
      aggregationField: imported.aggregationField,
      fieldsDependency: imported.fieldsDependency,
      filterRows: [...imported.filterRows],
      groupBy: [...imported.groupBy],
      dimensions: [...imported.dimensions],
      dateFieldGranularity: { ...imported.dateFieldGranularity },
      parameters: [...imported.parameters],
      computation: imported.computation,
      valueDisplayFormat: imported.valueDisplayFormat,
      version: imported.version,
      schemaVersionDependency: imported.schemaVersionDependency,
    });
  }

  async function handleSave() {
    const error = await editor.saveSelectedMetric();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("metrics.workbench.settings.saved"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0 space-y-2">
          <input
            className={`${controlClassName} text-base font-semibold`}
            value={draft.name}
            disabled={readOnly}
            aria-label={t("metrics.name")}
            onChange={(event) =>
              editor.updateDraft({ name: event.target.value })
            }
          />
          <textarea
            className={`${controlClassName} min-h-[56px]`}
            value={draft.description}
            disabled={readOnly}
            aria-label={t("metrics.descriptionLabel")}
            placeholder={t("metrics.descriptionPlaceholder")}
            onChange={(event) =>
              editor.updateDraft({ description: event.target.value })
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <FieldLabel htmlFor="metric-workbench-status">
                {t("metrics.status")}
              </FieldLabel>
              <Select
                id="metric-workbench-status"
                className={controlClassName}
                value={draft.status}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({
                    status: event.target.value as "ACTIVE" | "PAUSED",
                  })
                }
              >
                <option value="ACTIVE">
                  {t("metrics.statusValues.ACTIVE")}
                </option>
                <option value="PAUSED">
                  {t("metrics.statusValues.PAUSED")}
                </option>
              </Select>
            </div>
            <Text className="text-muted-foreground pt-5 text-xs">
              {sourceLabel} · {draft.sourceModel} · {modeLabel}
            </Text>
          </div>
          <Text className="text-muted-foreground text-xs">
            {t("metrics.versionLabel", { version: definition.version })}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MetricDefinitionJsonToolbar
            mode="edit"
            existingName={definition.name}
            canApply={canUpdate}
            labels={jsonLabels}
            formState={{
              name: draft.name,
              description: draft.description,
              computationMode: draft.computationMode,
              sourceModel: draft.sourceModel,
              sourceType: draft.sourceType,
              sourceQueryDefinitionId: draft.sourceQueryDefinitionId,
              status: draft.status,
              aggregationOperation: draft.aggregationOperation,
              aggregationField: draft.aggregationField,
              fieldsDependency: draft.fieldsDependency,
              filterRows: draft.filterRows,
              groupBy: draft.groupBy,
              dimensions: draft.dimensions,
              dateFieldGranularity: draft.dateFieldGranularity,
              parameters: draft.parameters,
              computation: draft.computation,
              valueDisplayFormat: draft.valueDisplayFormat,
              version: draft.version,
              schemaVersionDependency: draft.schemaVersionDependency,
            }}
            onImport={handleJsonImport}
          />
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={readOnly || !editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("metrics.workbench.settings.save")}
          </Button>
        </div>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        {draft.computationMode === "computed" ? (
          <MetricComputedDefinitionForm
            draft={draft}
            allDefinitions={editor.definitions}
            queryDefinitions={queryDefinitions}
            readOnly={readOnly}
            onChange={(patch) => editor.updateDraft(patch)}
          />
        ) : (
          <MetricAggregatedDefinitionForm
            draft={draft}
            isCreate={false}
            readOnly={readOnly}
            onChange={(patch) => editor.updateDraft(patch)}
          />
        )}
      </div>
    </div>
  );
}
