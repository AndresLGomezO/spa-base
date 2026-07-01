import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, IconButton, Input, Select, Text } from "@repo/ui";
import type {
  DataHookAction,
  DataHookExecutionMode,
  DataHookPhase,
  ExpressionNode,
} from "@repo/hooks";
import {
  DATA_HOOK_AGGREGATE_OPERATORS,
  MAX_CREATE_RECORDS,
  MAX_CREATE_RECORDS_QUEUED,
} from "@repo/hooks";

import { getEntityLabel } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { createDefaultConditionRoot } from "./data-hook-condition-utils";
import { DataHookConditionEditor } from "./DataHookConditionEditor";
import { ExpressionEditor } from "./ExpressionEditor";
import type { LoadedBinding } from "./expression-editor-node-types";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

const ACTION_TYPES: readonly DataHookAction["type"][] = [
  "setField",
  "createRecord",
  "createRecords",
  "updateMatching",
  "deleteMatching",
  "deleteRecord",
  "getRecord",
  "aggregateMatching",
  "sendNotification",
  "callWebhook",
];

function literal(): ExpressionNode {
  return { kind: "literal", value: "" };
}

function useEntityFieldNames(): (entityName: string) => readonly string[] {
  const { items } = useEntityCatalog();
  return (entityName: string) => {
    const entity = items.find((entry) => entry.name === entityName);
    return entity ? Object.keys(entity.fields) : [];
  };
}

function collectLoadedBindingsBefore(
  actions: readonly DataHookAction[],
  beforeIndex: number,
): readonly LoadedBinding[] {
  const bindings: LoadedBinding[] = [];
  for (let index = 0; index < beforeIndex; index += 1) {
    const action = actions[index];
    if (action?.type === "getRecord" && action.as.trim()) {
      bindings.push({ alias: action.as, entity: action.entity });
    }
  }
  return bindings;
}

function collectAggregateBindingsBefore(
  actions: readonly DataHookAction[],
  beforeIndex: number,
): readonly string[] {
  const aliases: string[] = [];
  for (let index = 0; index < beforeIndex; index += 1) {
    const action = actions[index];
    if (action?.type === "aggregateMatching" && action.as.trim()) {
      aliases.push(action.as);
    }
  }
  return aliases;
}

function FieldMapEditor({
  label,
  value,
  fieldNames,
  loadedBindings,
  aggregateBindings,
  onChange,
}: {
  readonly label: string;
  readonly value: Readonly<Record<string, ExpressionNode>>;
  readonly fieldNames: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
  readonly onChange: (next: Record<string, ExpressionNode>) => void;
}) {
  const { t } = useTranslation("common");
  const entries = Object.entries(value);

  function renameKey(oldKey: string, newKey: string) {
    const next: Record<string, ExpressionNode> = {};
    for (const [key, node] of Object.entries(value)) {
      next[key === oldKey ? newKey : key] = node;
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {entries.length === 0 ? (
        <Text className="text-muted-foreground text-xs">
          {t("dataHooks.actions.noFields")}
        </Text>
      ) : null}
      {entries.map(([key, node]) => (
        <div
          key={key}
          className="border-border space-y-2 rounded-md border p-2"
        >
          <div className="flex items-center gap-2">
            {fieldNames.length > 0 ? (
              <Select
                className={controlClassName}
                value={fieldNames.includes(key) ? key : ""}
                onChange={(event) => renameKey(key, event.target.value)}
              >
                <option value="">{t("dataHooks.actions.selectField")}</option>
                {!fieldNames.includes(key) && key ? (
                  <option value={key}>{key}</option>
                ) : null}
                {fieldNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={key}
                placeholder={t("dataHooks.actions.fieldName")}
                onChange={(event) => renameKey(key, event.target.value)}
              />
            )}
            <IconButton
              type="button"
              size="sm"
              label={t("dataHooks.actions.removeField")}
              onClick={() => {
                const next = { ...value };
                delete next[key];
                onChange(next);
              }}
            >
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          </div>
          <ExpressionEditor
            value={node}
            fieldNames={fieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(nextNode) => onChange({ ...value, [key]: nextNode })}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const nextKey = `field${String(entries.length + 1)}`;
          onChange({ ...value, [nextKey]: literal() });
        }}
      >
        <Plus aria-hidden className="mr-1 size-4" />
        {t("dataHooks.actions.addField")}
      </Button>
    </div>
  );
}

function ActionEditor({
  action,
  actions,
  actionIndex,
  triggerFieldNames,
  hookPhase,
  hookExecution,
  onChange,
}: {
  readonly action: DataHookAction;
  readonly actions: readonly DataHookAction[];
  readonly actionIndex: number;
  readonly triggerFieldNames: readonly string[];
  readonly hookPhase: DataHookPhase;
  readonly hookExecution?: DataHookExecutionMode;
  readonly onChange: (next: DataHookAction) => void;
}) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const getFieldNames = useEntityFieldNames();
  const loadedBindings = collectLoadedBindingsBefore(actions, actionIndex);
  const aggregateBindings = collectAggregateBindingsBefore(
    actions,
    actionIndex,
  );

  const entityOptions = (
    <>
      <option value="">{t("dataHooks.actions.selectEntity")}</option>
      {entities.map((entity) => (
        <option key={entity.name} value={entity.name}>
          {getEntityLabel(entity)}
        </option>
      ))}
    </>
  );

  switch (action.type) {
    case "setField":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetField")}</FieldLabel>
            {triggerFieldNames.length > 0 ? (
              <Select
                className={controlClassName}
                value={action.field}
                onChange={(event) =>
                  onChange({ ...action, field: event.target.value })
                }
              >
                <option value="">{t("dataHooks.actions.selectField")}</option>
                {!triggerFieldNames.includes(action.field) && action.field ? (
                  <option value={action.field}>{action.field}</option>
                ) : null}
                {triggerFieldNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={action.field}
                onChange={(event) =>
                  onChange({ ...action, field: event.target.value })
                }
              />
            )}
          </div>
          <ExpressionEditor
            label={t("dataHooks.actions.value")}
            value={action.value}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(value) => onChange({ ...action, value })}
          />
        </div>
      );

    case "sendNotification":
      return (
        <ExpressionEditor
          label={t("dataHooks.actions.message")}
          value={action.message}
          fieldNames={triggerFieldNames}
          loadedBindings={loadedBindings}
          aggregateBindings={aggregateBindings}
          onChange={(message) => onChange({ ...action, message })}
        />
      );

    case "callWebhook":
      return (
        <div className="space-y-3">
          <ExpressionEditor
            label={t("dataHooks.actions.webhookUrl")}
            value={action.url}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(url) => onChange({ ...action, url })}
          />
          <ExpressionEditor
            label={t("dataHooks.actions.webhookBody")}
            value={
              action.body ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(body) =>
              onChange({
                ...action,
                body:
                  body.kind === "literal" && body.value === null
                    ? undefined
                    : body,
              })
            }
          />
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.actions.webhookBodyHint")}
          </Text>
        </div>
      );

    case "createRecord":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <FieldMapEditor
            label={t("dataHooks.actions.recordData")}
            value={action.data}
            fieldNames={getFieldNames(action.entity)}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(data) => onChange({ ...action, data })}
          />
        </div>
      );

    case "createRecords":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <ExpressionEditor
            label={t("dataHooks.actions.count")}
            value={action.count}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(count) => onChange({ ...action, count })}
          />
          <ExpressionEditor
            label={t("dataHooks.actions.startIndex")}
            value={action.startIndex ?? { kind: "literal", value: 0 }}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(startIndex) => onChange({ ...action, startIndex })}
          />
          <Text className="text-muted-foreground text-xs">
            {hookPhase === "after" && hookExecution === "queued"
              ? t("dataHooks.actions.createRecordsQueuedHint", {
                  max: MAX_CREATE_RECORDS_QUEUED,
                })
              : t("dataHooks.actions.createRecordsLimitsHint", {
                  max: MAX_CREATE_RECORDS,
                  queuedMax: MAX_CREATE_RECORDS_QUEUED,
                })}
          </Text>
          <FieldMapEditor
            label={t("dataHooks.actions.recordData")}
            value={action.data}
            fieldNames={getFieldNames(action.entity)}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(data) => onChange({ ...action, data })}
          />
        </div>
      );

    case "updateMatching":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <DataHookConditionEditor
            value={action.where}
            fieldNames={getFieldNames(action.entity)}
            valueFieldNames={triggerFieldNames}
            rootTitle={t("dataHooks.actions.matchWhere")}
            onChange={(where) => onChange({ ...action, where })}
          />
          <FieldMapEditor
            label={t("dataHooks.actions.setFields")}
            value={action.set}
            fieldNames={getFieldNames(action.entity)}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(set) => onChange({ ...action, set })}
          />
        </div>
      );

    case "deleteMatching":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <DataHookConditionEditor
            value={action.where}
            fieldNames={getFieldNames(action.entity)}
            valueFieldNames={triggerFieldNames}
            rootTitle={t("dataHooks.actions.matchWhere")}
            onChange={(where) => onChange({ ...action, where })}
          />
        </div>
      );

    case "deleteRecord":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <ExpressionEditor
            label={t("dataHooks.actions.recordId")}
            value={action.id}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(id) => onChange({ ...action, id })}
          />
        </div>
      );

    case "getRecord":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <ExpressionEditor
            label={t("dataHooks.actions.recordId")}
            value={action.id}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(id) => onChange({ ...action, id })}
          />
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.alias")}</FieldLabel>
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </div>
        </div>
      );

    case "aggregateMatching":
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.targetEntity")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.entity}
              onChange={(event) =>
                onChange({ ...action, entity: event.target.value })
              }
            >
              {entityOptions}
            </Select>
          </div>
          <DataHookConditionEditor
            value={action.where}
            fieldNames={getFieldNames(action.entity)}
            valueFieldNames={triggerFieldNames}
            rootTitle={t("dataHooks.actions.matchWhere")}
            onChange={(where) => onChange({ ...action, where })}
          />
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.aggregateOp")}</FieldLabel>
            <Select
              className={controlClassName}
              value={action.op}
              onChange={(event) =>
                onChange({
                  ...action,
                  op: event.target
                    .value as (typeof DATA_HOOK_AGGREGATE_OPERATORS)[number],
                  ...(event.target.value === "count"
                    ? { field: undefined }
                    : {}),
                })
              }
            >
              {DATA_HOOK_AGGREGATE_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {t(`dataHooks.actions.aggregateOps.${op}`)}
                </option>
              ))}
            </Select>
          </div>
          {action.op !== "count" ? (
            <div className="space-y-1">
              <FieldLabel>{t("dataHooks.actions.aggregateField")}</FieldLabel>
              {getFieldNames(action.entity).length > 0 ? (
                <Select
                  className={controlClassName}
                  value={action.field ?? ""}
                  onChange={(event) =>
                    onChange({ ...action, field: event.target.value })
                  }
                >
                  <option value="">{t("dataHooks.actions.selectField")}</option>
                  {getFieldNames(action.entity).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={action.field ?? ""}
                  onChange={(event) =>
                    onChange({ ...action, field: event.target.value })
                  }
                />
              )}
            </div>
          ) : null}
          <div className="space-y-1">
            <FieldLabel>{t("dataHooks.actions.alias")}</FieldLabel>
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </div>
        </div>
      );

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function emptyActionOfType(type: DataHookAction["type"]): DataHookAction {
  switch (type) {
    case "setField":
      return { type, field: "", value: literal() };
    case "createRecord":
      return { type, entity: "", data: {} };
    case "createRecords":
      return {
        type,
        entity: "",
        count: { kind: "literal", value: 1 },
        data: {},
      };
    case "updateMatching":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
        set: {},
      };
    case "deleteMatching":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
      };
    case "deleteRecord":
      return { type, entity: "", id: literal() };
    case "getRecord":
      return { type, entity: "", id: literal(), as: "parent" };
    case "aggregateMatching":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
        op: "count",
        as: "total",
      };
    case "sendNotification":
      return { type, message: literal() };
    case "callWebhook":
      return { type, url: literal() };
  }
}

export function DataHookActionsEditor({
  actions,
  triggerEntity,
  hookPhase,
  hookExecution,
  disabled,
  onChange,
}: {
  readonly actions: readonly DataHookAction[];
  readonly triggerEntity: string;
  readonly hookPhase: DataHookPhase;
  readonly hookExecution?: DataHookExecutionMode;
  readonly disabled: boolean;
  readonly onChange: (next: readonly DataHookAction[]) => void;
}) {
  const { t } = useTranslation("common");
  const getFieldNames = useEntityFieldNames();
  const triggerFieldNames = getFieldNames(triggerEntity);

  function updateAt(index: number, next: DataHookAction) {
    onChange(actions.map((action, i) => (i === index ? next : action)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel>{t("dataHooks.actions.title")}</FieldLabel>
      </div>
      {actions.map((action, index) => (
        <div
          key={index}
          className="border-border bg-muted/20 space-y-3 rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <Select
              className={`${controlClassName} w-52`}
              value={action.type}
              disabled={disabled}
              onChange={(event) =>
                updateAt(
                  index,
                  emptyActionOfType(
                    event.target.value as DataHookAction["type"],
                  ),
                )
              }
            >
              {ACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`dataHooks.actionType.${type}`)}
                </option>
              ))}
            </Select>
            <div className="flex-1" />
            <IconButton
              type="button"
              size="sm"
              label={t("dataHooks.actions.remove")}
              disabled={disabled || actions.length <= 1}
              onClick={() => onChange(actions.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          </div>
          <ActionEditor
            action={action}
            actions={actions}
            actionIndex={index}
            triggerFieldNames={triggerFieldNames}
            hookPhase={hookPhase}
            hookExecution={hookExecution}
            onChange={(next) => updateAt(index, next)}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...actions, emptyActionOfType("setField")])}
      >
        <Plus aria-hidden className="mr-1 size-4" />
        {t("dataHooks.actions.add")}
      </Button>
    </div>
  );
}
