import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, FieldLabel, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import type {
  DataHookOperation,
  DataHookPhase,
  DataHookScheduleScope,
  DataHookTrigger,
} from "@repo/hooks";
import {
  DATA_HOOK_EXECUTION_MODES,
  DATA_HOOK_OPERATIONS,
  DATA_HOOK_PHASES,
  DATA_HOOK_SCHEDULE_SCOPES,
  DATA_HOOK_TRIGGER_KINDS,
  isEmailTrigger,
  isScheduleTrigger,
} from "@repo/hooks";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  listDataHookExecutions,
  listEmailMatchBindings,
  type EmailMatchBindingRecord,
} from "../../lib/api-client";
import { buildDebugRecordKey } from "../debugger/dismissed-debug-records";
import { bindingDisplayName } from "../email-matching/email-matching-draft";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import {
  DataHookActionsEditor,
  emptyActionOfType,
} from "./DataHookActionsEditor";
import { DataHookConditionEditor } from "./DataHookConditionEditor";
import { createDefaultConditionRoot } from "./data-hook-condition-utils";
import { useDataHooks } from "./data-hooks-context";
import { DataHookDefinitionJsonToolbar } from "./json/DataHookDefinitionJsonToolbar";
import { dataHookDefinitionFormJsonLabels } from "./json/data-hook-definition-json-labels";
import type { DataHookFormStateImportResult } from "./json/export-data-hook-form-state";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

function HookRecentExecutions({ hookId }: { readonly hookId: string }) {
  const { t } = useTranslation("common");
  const executionsQuery = useQuery({
    queryKey: ["data-hook-executions", hookId],
    queryFn: () => listDataHookExecutions(hookId, { limit: 5 }),
    enabled: hookId.trim().length > 0,
  });

  const items = executionsQuery.data?.items ?? [];
  if (executionsQuery.isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("table.loading")}
      </Text>
    );
  }

  if (items.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("dataHooks.executionLog.empty")}
      </Text>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const writes =
          (item.writesCreated ?? 0) +
          (item.writesUpdated ?? 0) +
          (item.writesDeleted ?? 0);
        const recordKey = buildDebugRecordKey("hookExecution", item.id);
        return (
          <li key={item.id}>
            <Link
              to={`/debugger/hook-executions?record=${encodeURIComponent(recordKey)}`}
              className="hover:bg-muted flex flex-col rounded-md px-2 py-1.5 text-sm"
            >
              <span className="font-medium">
                {item.status} · {item.event}
              </span>
              <span className="text-muted-foreground text-xs">
                {item.startedAt}
                {item.durationMs != null ? ` · ${item.durationMs}ms` : ""}
                {writes > 0 ? ` · ${writes} writes` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function triggerKind(trigger: DataHookTrigger): "crud" | "schedule" | "email" {
  if (isScheduleTrigger(trigger)) return "schedule";
  if (isEmailTrigger(trigger)) return "email";
  return "crud";
}

function defaultCrudTrigger(
  operation: DataHookOperation = "create",
): DataHookTrigger {
  return { kind: "crud", operation };
}

function defaultScheduleTrigger(): DataHookTrigger {
  return {
    kind: "schedule",
    cron: "0 6 * * *",
    timezone: "UTC",
    scope: "once",
  };
}

function defaultEmailTrigger(): DataHookTrigger {
  return { kind: "email" };
}

function EmailBindingIdsEditor({
  bindingIds,
  bindings,
  isLoading,
  canUpdate,
  onChange,
}: {
  readonly bindingIds: readonly string[];
  readonly bindings: readonly EmailMatchBindingRecord[];
  readonly isLoading: boolean;
  readonly canUpdate: boolean;
  readonly onChange: (next: readonly string[] | undefined) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <CollapsibleEditorCard
      title={t("dataHooks.settings.sections.emailBindings")}
      defaultOpen={bindingIds.length > 0}
      className="bg-muted/20 shadow-sm"
    >
      <Text className="text-muted-foreground text-xs">
        {t("dataHooks.settings.emailBindingIdsHint")}
      </Text>
      {isLoading ? (
        <Text className="text-muted-foreground text-sm">
          {t("dataHooks.settings.emailBindingIdsLoading")}
        </Text>
      ) : bindings.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("dataHooks.settings.emailBindingIdsEmpty")}
        </Text>
      ) : (
        <div className="flex flex-col gap-2">
          <Text className="text-muted-foreground text-xs">
            {bindingIds.length === 0
              ? t("dataHooks.settings.emailBindingIdsAny")
              : t("dataHooks.settings.emailBindingIdsSelected", {
                  count: bindingIds.length,
                })}
          </Text>
          <div className="flex flex-col gap-1.5">
            {bindings.map((binding) => {
              const checked = bindingIds.includes(binding.id);
              return (
                <label
                  key={binding.id}
                  className="border-border flex items-start gap-2 rounded-md border px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    disabled={!canUpdate}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...bindingIds, binding.id]
                        : bindingIds.filter((id) => id !== binding.id);
                      onChange(next.length > 0 ? next : undefined);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">
                      {bindingDisplayName(binding)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {t("dataHooks.settings.emailBindingIdsMeta", {
                        order: binding.order,
                        id: binding.id.slice(0, 8),
                      })}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </CollapsibleEditorCard>
  );
}

export function DataHookSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useDataHooks();
  const { items: entities } = useEntityCatalog();
  const jsonLabels = useMemo(() => dataHookDefinitionFormJsonLabels(t), [t]);

  const triggerFieldNames = useMemo(() => {
    const entity = entities.find((entry) => entry.name === editor.entityName);
    return entity ? Object.keys(entity.fields) : [];
  }, [entities, editor.entityName]);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;
  const isEmailDraft = draft ? isEmailTrigger(draft.trigger) : false;

  const emailBindingsQuery = useQuery({
    queryKey: ["data-hook-email-bindings", editor.entityName],
    queryFn: () => listEmailMatchBindings({ entityName: editor.entityName }),
    enabled: isEmailDraft && editor.entityName.trim().length > 0,
  });

  const emailBindings = useMemo(() => {
    const items = emailBindingsQuery.data?.items ?? [];
    return [...items].sort(
      (left, right) =>
        left.order - right.order ||
        bindingDisplayName(left).localeCompare(bindingDisplayName(right)),
    );
  }, [emailBindingsQuery.data?.items]);

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

  const handleJsonImport = (imported: DataHookFormStateImportResult) => {
    editor.updateDraft({
      ...(imported.description !== undefined
        ? { description: imported.description }
        : {}),
      phase: imported.phase,
      trigger: imported.trigger,
      condition: imported.condition,
      actions: [...imported.actions],
      enabled: imported.enabled,
      order: imported.order,
      chainHooks: imported.chainHooks,
      execution: imported.execution,
    });
  };

  const conditionEnabled = draft.condition !== null;
  const isScheduled = isScheduleTrigger(draft.trigger);
  const isEmail = isEmailTrigger(draft.trigger);

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0">
          <Text className="text-foreground text-base font-semibold">
            {definition.name}
          </Text>
          {(draft.description ?? definition.description) ? (
            <Text className="text-muted-foreground text-sm">
              {draft.description ?? definition.description}
            </Text>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataHookDefinitionJsonToolbar
            existingName={definition.name}
            existingEntity={editor.entityName}
            canApply={canUpdate}
            labels={jsonLabels}
            formState={{
              name: definition.name,
              ...(draft.description !== undefined
                ? { description: draft.description }
                : definition.description !== undefined
                  ? { description: definition.description }
                  : {}),
              entity: editor.entityName,
              phase: draft.phase,
              trigger: draft.trigger,
              condition: draft.condition,
              actions: draft.actions,
              enabled: draft.enabled,
              order: draft.order,
              chainHooks: draft.chainHooks,
              execution: draft.execution,
            }}
            onImport={handleJsonImport}
          />
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={!canUpdate || !editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("dataHooks.settings.save")}
          </Button>
        </div>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        <div className="space-y-4">
          <CollapsibleEditorCard
            title={t("dataHooks.settings.sections.trigger")}
            defaultOpen
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <FieldLabel>{t("dataHooks.settings.triggerKind")}</FieldLabel>
                <Select
                  className={controlClassName}
                  value={triggerKind(draft.trigger)}
                  disabled={!canUpdate}
                  onChange={(event) => {
                    const kind = event.target.value as
                      | "crud"
                      | "schedule"
                      | "email";
                    if (kind === "schedule") {
                      editor.updateDraft({
                        phase: "after",
                        execution:
                          draft.execution === "sync"
                            ? "queued"
                            : draft.execution,
                        trigger: defaultScheduleTrigger(),
                      });
                      return;
                    }
                    if (kind === "email") {
                      editor.updateDraft({
                        phase: "after",
                        trigger: defaultEmailTrigger(),
                      });
                      return;
                    }

                    const operation =
                      isScheduleTrigger(draft.trigger) ||
                      isEmailTrigger(draft.trigger)
                        ? "create"
                        : draft.trigger.operation;
                    editor.updateDraft({
                      trigger: defaultCrudTrigger(operation),
                    });
                  }}
                >
                  {DATA_HOOK_TRIGGER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`dataHooks.triggerKind.${kind}`)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {!isScheduled && !isEmail ? (
                  <div className="space-y-1">
                    <FieldLabel>{t("dataHooks.settings.operation")}</FieldLabel>
                    <Select
                      className={controlClassName}
                      value={draft.trigger.operation}
                      disabled={!canUpdate}
                      onChange={(event) => {
                        if (
                          isScheduleTrigger(draft.trigger) ||
                          isEmailTrigger(draft.trigger)
                        ) {
                          return;
                        }
                        editor.updateDraft({
                          trigger: {
                            ...draft.trigger,
                            operation: event.target.value as DataHookOperation,
                          },
                        });
                      }}
                    >
                      {DATA_HOOK_OPERATIONS.map((operation) => (
                        <option key={operation} value={operation}>
                          {t(`dataHooks.operation.${operation}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                {isScheduled ? (
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>{t("dataHooks.settings.cron")}</FieldLabel>
                    <input
                      className={controlClassName}
                      value={draft.trigger.cron}
                      disabled={!canUpdate}
                      onChange={(event) => {
                        if (!isScheduleTrigger(draft.trigger)) {
                          return;
                        }
                        editor.updateDraft({
                          trigger: {
                            ...draft.trigger,
                            cron: event.target.value,
                          },
                        });
                      }}
                    />
                    <Text className="text-muted-foreground text-xs">
                      {t("dataHooks.settings.cronHint")}
                    </Text>
                  </div>
                ) : null}

                {isEmail ? (
                  <div className="space-y-1 sm:col-span-2">
                    <Text className="text-muted-foreground text-sm">
                      {t("dataHooks.settings.emailHint")}
                    </Text>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <FieldLabel>{t("dataHooks.settings.phase")}</FieldLabel>
                  <Select
                    className={controlClassName}
                    value={draft.phase}
                    disabled={!canUpdate || isScheduled || isEmail}
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

              {isScheduled ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <FieldLabel>{t("dataHooks.settings.timezone")}</FieldLabel>
                    <input
                      className={controlClassName}
                      value={draft.trigger.timezone ?? "UTC"}
                      disabled={!canUpdate}
                      onChange={(event) => {
                        if (!isScheduleTrigger(draft.trigger)) {
                          return;
                        }
                        editor.updateDraft({
                          trigger: {
                            ...draft.trigger,
                            timezone: event.target.value,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel>
                      {t("dataHooks.settings.scheduleScope")}
                    </FieldLabel>
                    <Select
                      className={controlClassName}
                      value={draft.trigger.scope ?? "once"}
                      disabled={!canUpdate}
                      onChange={(event) => {
                        if (!isScheduleTrigger(draft.trigger)) {
                          return;
                        }
                        const scope = event.target
                          .value as DataHookScheduleScope;
                        editor.updateDraft({
                          trigger: {
                            ...draft.trigger,
                            scope,
                            ...(scope === "once"
                              ? { eachRecordWhere: undefined }
                              : {
                                  eachRecordWhere:
                                    draft.trigger.eachRecordWhere ??
                                    createDefaultConditionRoot(
                                      triggerFieldNames[0] ?? "",
                                    ),
                                }),
                          },
                        });
                      }}
                    >
                      {DATA_HOOK_SCHEDULE_SCOPES.map((scope) => (
                        <option key={scope} value={scope}>
                          {t(`dataHooks.scheduleScope.${scope}`)}
                        </option>
                      ))}
                    </Select>
                    <Text className="text-muted-foreground text-xs">
                      {t("dataHooks.settings.scheduleScopeHint")}
                    </Text>
                  </div>
                </div>
              ) : null}

              {isScheduled &&
              isScheduleTrigger(draft.trigger) &&
              (draft.trigger.scope ?? "once") === "eachRecord" ? (
                <CollapsibleEditorCard
                  title={t("dataHooks.settings.sections.eachRecordWhere")}
                  defaultOpen
                  className="bg-muted/20 shadow-sm"
                >
                  <DataHookConditionEditor
                    value={
                      draft.trigger.eachRecordWhere ??
                      createDefaultConditionRoot(triggerFieldNames[0] ?? "")
                    }
                    fieldNames={triggerFieldNames}
                    disabled={!canUpdate}
                    suppressRootHeader
                    onChange={(eachRecordWhere) => {
                      if (!isScheduleTrigger(draft.trigger)) {
                        return;
                      }
                      editor.updateDraft({
                        trigger: {
                          ...draft.trigger,
                          eachRecordWhere,
                        },
                      });
                    }}
                  />
                </CollapsibleEditorCard>
              ) : null}

              {!isScheduled &&
              !isEmail &&
              !isScheduleTrigger(draft.trigger) &&
              !isEmailTrigger(draft.trigger) &&
              draft.trigger.operation === "update" ? (
                <CollapsibleEditorCard
                  title={t("dataHooks.settings.sections.updateFields")}
                  defaultOpen={Boolean(draft.trigger.updateFields?.length)}
                  className="bg-muted/20 shadow-sm"
                >
                  <Text className="text-muted-foreground text-xs">
                    {t("dataHooks.settings.updateFieldsHint")}
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {triggerFieldNames.map((name) => {
                      const crudTrigger = draft.trigger;
                      const checked =
                        !isScheduleTrigger(crudTrigger) &&
                        !isEmailTrigger(crudTrigger) &&
                        (crudTrigger.updateFields?.includes(name) ?? false);
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
                              if (
                                isScheduleTrigger(draft.trigger) ||
                                isEmailTrigger(draft.trigger)
                              ) {
                                return;
                              }
                              const current = draft.trigger.updateFields ?? [];
                              const next = event.target.checked
                                ? [...current, name]
                                : current.filter(
                                    (field: string) => field !== name,
                                  );
                              editor.updateDraft({
                                trigger: {
                                  ...draft.trigger,
                                  updateFields:
                                    next.length > 0 ? next : undefined,
                                },
                              });
                            }}
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleEditorCard>
              ) : null}

              {isEmail && isEmailTrigger(draft.trigger) ? (
                <EmailBindingIdsEditor
                  bindingIds={draft.trigger.bindingIds ?? []}
                  bindings={emailBindings}
                  isLoading={emailBindingsQuery.isLoading}
                  canUpdate={canUpdate}
                  onChange={(next) => {
                    editor.updateDraft({
                      trigger: {
                        kind: "email",
                        ...(next ? { bindingIds: next } : {}),
                      },
                    });
                  }}
                />
              ) : null}
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("dataHooks.settings.sections.condition")}
            defaultOpen={conditionEnabled}
          >
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
                suppressRootHeader
                onChange={(condition) => editor.updateDraft({ condition })}
              />
            ) : null}
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("dataHooks.settings.sections.actions")}
            defaultOpen
            onAdd={
              canUpdate
                ? () =>
                    editor.updateDraft({
                      actions: [
                        ...draft.actions,
                        emptyActionOfType("setField"),
                      ],
                    })
                : undefined
            }
            addLabel={t("dataHooks.actions.add")}
          >
            <DataHookActionsEditor
              actions={draft.actions}
              triggerEntity={editor.entityName}
              hookPhase={draft.phase}
              hookExecution={draft.execution}
              disabled={!canUpdate}
              showAddButton={false}
              onChange={(actions) => editor.updateDraft({ actions })}
            />
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("dataHooks.settings.sections.advanced")}
          >
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
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("dataHooks.settings.sections.executionLog")}
          >
            <HookRecentExecutions hookId={definition.id} />
            <Link
              to="/debugger/hook-executions"
              className="text-primary inline-flex text-sm font-medium hover:underline"
            >
              {t("debugger.viewInDebugger")}
            </Link>
          </CollapsibleEditorCard>
        </div>
      </div>
    </div>
  );
}
