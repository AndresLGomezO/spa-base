import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Select, Text, toast } from "@repo/ui";
import type { DataHookOperation, DataHookPhase } from "@repo/hooks";
import {
  DATA_HOOK_EXECUTION_MODES,
  DATA_HOOK_OPERATIONS,
  DATA_HOOK_PHASES,
} from "@repo/hooks";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { DataHookActionsEditor } from "./DataHookActionsEditor";
import { DataHookConditionEditor } from "./DataHookConditionEditor";
import { DataHookExecutionLogPanel } from "./DataHookExecutionLogPanel";
import { createDefaultConditionRoot } from "./data-hook-condition-utils";
import { useDataHooks } from "./data-hooks-context";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

export function DataHookSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useDataHooks();
  const { items: entities } = useEntityCatalog();

  const triggerFieldNames = useMemo(() => {
    const entity = entities.find((entry) => entry.name === editor.entityName);
    return entity ? Object.keys(entity.fields) : [];
  }, [entities, editor.entityName]);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;

  if (!definition || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("dataHooks.settings.empty")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedHook();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("dataHooks.settings.saved"));
  }

  const conditionEnabled = draft.condition !== null;

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0">
          <Text className="text-foreground text-base font-semibold">
            {definition.name}
          </Text>
          {definition.description ? (
            <Text className="text-muted-foreground text-sm">
              {definition.description}
            </Text>
          ) : null}
        </div>
        <Button
          type="button"
          loading={editor.isSaving}
          disabled={!canUpdate || !editor.isDirty}
          onClick={() => void handleSave()}
        >
          {t("dataHooks.settings.save")}
        </Button>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        <div className="max-w-2xl space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <FieldLabel>{t("dataHooks.settings.operation")}</FieldLabel>
              <Select
                className={controlClassName}
                value={draft.trigger.operation}
                disabled={!canUpdate}
                onChange={(event) =>
                  editor.updateDraft({
                    trigger: {
                      ...draft.trigger,
                      operation: event.target.value as DataHookOperation,
                    },
                  })
                }
              >
                {DATA_HOOK_OPERATIONS.map((operation) => (
                  <option key={operation} value={operation}>
                    {t(`dataHooks.operation.${operation}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <FieldLabel>{t("dataHooks.settings.phase")}</FieldLabel>
              <Select
                className={controlClassName}
                value={draft.phase}
                disabled={!canUpdate}
                onChange={(event) => {
                  const phase = event.target.value as DataHookPhase;
                  editor.updateDraft({
                    phase,
                    ...(phase === "before"
                      ? { execution: "sync" as const }
                      : {}),
                  });
                }}
              >
                {DATA_HOOK_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {t(`dataHooks.phase.${phase}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <FieldLabel>{t("dataHooks.settings.status")}</FieldLabel>
              <Select
                className={controlClassName}
                value={draft.enabled ? "enabled" : "disabled"}
                disabled={!canUpdate}
                onChange={(event) =>
                  editor.updateDraft({
                    enabled: event.target.value === "enabled",
                  })
                }
              >
                <option value="enabled">
                  {t("dataHooks.settings.enabled")}
                </option>
                <option value="disabled">
                  {t("dataHooks.settings.disabled")}
                </option>
              </Select>
            </div>
          </div>

          {draft.trigger.operation === "update" ? (
            <div className="space-y-2">
              <FieldLabel>{t("dataHooks.settings.updateFields")}</FieldLabel>
              <Text className="text-muted-foreground text-xs">
                {t("dataHooks.settings.updateFieldsHint")}
              </Text>
              <div className="flex flex-wrap gap-2">
                {triggerFieldNames.map((name) => {
                  const checked =
                    draft.trigger.updateFields?.includes(name) ?? false;
                  return (
                    <label
                      key={name}
                      className="border-border flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canUpdate}
                        onChange={(event) => {
                          const current = draft.trigger.updateFields ?? [];
                          const next = event.target.checked
                            ? [...current, name]
                            : current.filter((field) => field !== name);
                          editor.updateDraft({
                            trigger: {
                              ...draft.trigger,
                              updateFields: next.length > 0 ? next : undefined,
                            },
                          });
                        }}
                      />
                      {name}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={conditionEnabled}
                disabled={!canUpdate}
                onChange={(event) =>
                  editor.updateDraft({
                    condition: event.target.checked
                      ? createDefaultConditionRoot(triggerFieldNames[0] ?? "")
                      : null,
                  })
                }
              />
              {t("dataHooks.settings.condition")}
            </label>

            {conditionEnabled && draft.condition ? (
              <DataHookConditionEditor
                value={draft.condition}
                fieldNames={triggerFieldNames}
                disabled={!canUpdate}
                onChange={(condition) => editor.updateDraft({ condition })}
              />
            ) : null}
          </div>

          <DataHookActionsEditor
            actions={draft.actions}
            triggerEntity={editor.entityName}
            disabled={!canUpdate}
            onChange={(actions) => editor.updateDraft({ actions })}
          />

          <div className="space-y-3 border-t pt-4">
            <Text className="text-sm font-semibold">
              {t("dataHooks.settings.advanced")}
            </Text>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.chainHooks}
                disabled={!canUpdate}
                onChange={(event) =>
                  editor.updateDraft({ chainHooks: event.target.checked })
                }
              />
              {t("dataHooks.settings.chainHooks")}
            </label>
            <Text className="text-muted-foreground text-xs">
              {t("dataHooks.settings.chainHooksHint")}
            </Text>

            {draft.phase === "after" ? (
              <div className="space-y-1">
                <FieldLabel>{t("dataHooks.settings.execution")}</FieldLabel>
                <Select
                  className={controlClassName}
                  value={draft.execution}
                  disabled={!canUpdate}
                  onChange={(event) =>
                    editor.updateDraft({
                      execution: event.target
                        .value as (typeof DATA_HOOK_EXECUTION_MODES)[number],
                    })
                  }
                >
                  {DATA_HOOK_EXECUTION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {t(`dataHooks.execution.${mode}`)}
                    </option>
                  ))}
                </Select>
                {draft.execution === "deferred" ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("dataHooks.settings.executionDeferredHint")}
                  </Text>
                ) : null}
                {draft.execution === "queued" ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("dataHooks.settings.executionQueuedHint")}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Text className="text-sm font-semibold">
            {t("dataHooks.executionLog.title")}
          </Text>
          <DataHookExecutionLogPanel hookId={definition.id} />
        </div>
      </div>
    </div>
  );
}
