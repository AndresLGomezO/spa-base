import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, Checkbox, IconButton, Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
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

const nestedCardClassName = "bg-muted/20 shadow-sm";

function CollapsibleSection({
  title,
  defaultOpen = false,
  headerEnd,
  onAdd,
  addLabel,
  children,
}: {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly headerEnd?: ReactNode;
  readonly onAdd?: () => void;
  readonly addLabel?: string;
  readonly children: ReactNode;
}) {
  return (
    <CollapsibleEditorCard
      title={title}
      defaultOpen={defaultOpen}
      className={nestedCardClassName}
      headerEnd={headerEnd}
      onAdd={onAdd}
      addLabel={addLabel}
    >
      {children}
    </CollapsibleEditorCard>
  );
}

function CollapsibleExpressionEditor({
  label,
  defaultOpen = false,
  showPreview = true,
  value,
  onChange,
  fieldNames,
  loadedBindings,
  aggregateBindings,
}: {
  readonly label: string;
  readonly defaultOpen?: boolean;
  readonly showPreview?: boolean;
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly loadedBindings?: readonly LoadedBinding[];
  readonly aggregateBindings?: readonly string[];
}) {
  return (
    <CollapsibleSection title={label} defaultOpen={defaultOpen}>
      <ExpressionEditor
        value={value}
        onChange={onChange}
        fieldNames={fieldNames}
        loadedBindings={loadedBindings}
        aggregateBindings={aggregateBindings}
        showPreview={showPreview}
        collapsibleNested
      />
    </CollapsibleSection>
  );
}

function TargetEntitySelect({
  label,
  value,
  defaultOpen = true,
  onChange,
  entityOptions,
}: {
  readonly label: string;
  readonly value: string;
  readonly defaultOpen?: boolean;
  readonly onChange: (entity: string) => void;
  readonly entityOptions: ReactNode;
}) {
  return (
    <CollapsibleSection title={label} defaultOpen={defaultOpen}>
      <Select
        className={controlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {entityOptions}
      </Select>
    </CollapsibleSection>
  );
}

const ACTION_TYPES: readonly DataHookAction["type"][] = [
  "setField",
  "createRecord",
  "createRecords",
  "updateMatching",
  "deleteMatching",
  "deleteRecord",
  "getRecord",
  "getOrCreateRecord",
  "matchRelatedRecord",
  "aggregateMatching",
  "sendNotification",
  "callWebhook",
  "callAi",
  "computeEmbedding",
  "computeRecordAiSummary",
  "upsertAiRecordContext",
  "enqueueAiRecordNarrative",
  "invalidateAiRecordNarratives",
  "matchSimilarRecord",
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
    if (
      (action?.type === "getRecord" ||
        action?.type === "getOrCreateRecord" ||
        action?.type === "matchRelatedRecord" ||
        action?.type === "matchSimilarRecord" ||
        action?.type === "callAi" ||
        action?.type === "computeEmbedding" ||
        action?.type === "computeRecordAiSummary" ||
        action?.type === "upsertAiRecordContext" ||
        action?.type === "enqueueAiRecordNarrative" ||
        action?.type === "invalidateAiRecordNarratives") &&
      action.as.trim()
    ) {
      bindings.push({
        alias: action.as,
        entity:
          action.type === "callAi" ||
          action.type === "computeEmbedding" ||
          action.type === "computeRecordAiSummary" ||
          action.type === "upsertAiRecordContext" ||
          action.type === "enqueueAiRecordNarrative" ||
          action.type === "invalidateAiRecordNarratives"
            ? ""
            : action.entity,
      });
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
    <CollapsibleSection
      title={label}
      defaultOpen={entries.length > 0}
      onAdd={() => {
        const nextKey = `field${String(entries.length + 1)}`;
        onChange({ ...value, [nextKey]: literal() });
      }}
      addLabel={t("dataHooks.actions.addField")}
    >
      {entries.length === 0 ? (
        <Text className="text-muted-foreground text-xs">
          {t("dataHooks.actions.noFields")}
        </Text>
      ) : null}
      <div className="space-y-2">
        {entries.map(([key, node]) => (
          <CollapsibleSection
            key={key}
            title={key.trim() || t("dataHooks.actions.selectField")}
            headerEnd={
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
            }
          >
            <div className="space-y-2">
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
              <ExpressionEditor
                value={node}
                fieldNames={fieldNames}
                loadedBindings={loadedBindings}
                aggregateBindings={aggregateBindings}
                onChange={(nextNode) => onChange({ ...value, [key]: nextNode })}
                collapsibleNested
                showPreview={false}
              />
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </CollapsibleSection>
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
          <CollapsibleSection
            title={t("dataHooks.actions.targetField")}
            defaultOpen={Boolean(action.field)}
          >
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
          </CollapsibleSection>
          <CollapsibleExpressionEditor
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
        <CollapsibleExpressionEditor
          label={t("dataHooks.actions.message")}
          defaultOpen
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
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.webhookUrl")}
            defaultOpen
            value={action.url}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(url) => onChange({ ...action, url })}
          />
          <CollapsibleExpressionEditor
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

    case "callAi":
      return (
        <div className="space-y-3">
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiPrompt")}
            defaultOpen
            value={action.prompt}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(prompt) => onChange({ ...action, prompt })}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiSystemInstruction")}
            value={
              action.systemInstruction ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(systemInstruction) =>
              onChange({
                ...action,
                systemInstruction:
                  systemInstruction.kind === "literal" &&
                  systemInstruction.value === null
                    ? undefined
                    : systemInstruction,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiWhen")}
            value={
              action.when ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(when) =>
              onChange({
                ...action,
                when:
                  when.kind === "literal" && when.value === null
                    ? undefined
                    : when,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.actions.aiHint")}
          </Text>
        </div>
      );

    case "computeEmbedding":
      return (
        <div className="space-y-3">
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.embeddingText")}
            defaultOpen
            value={action.text}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(text) => onChange({ ...action, text })}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiWhen")}
            value={
              action.when ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(when) =>
              onChange({
                ...action,
                when:
                  when.kind === "literal" && when.value === null
                    ? undefined
                    : when,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
        </div>
      );

    case "computeRecordAiSummary":
      return (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-sm">
            {t("dataHooks.actions.computeRecordAiSummaryHint")}{" "}
            <a
              href="/settings/ai-context/record-summaries"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("dataHooks.actions.computeRecordAiSummaryLink")}
            </a>
          </Text>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.targetEntity")}
            value={
              action.entityName ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(entityName) =>
              onChange({
                ...action,
                entityName:
                  entityName.kind === "literal" && entityName.value === null
                    ? undefined
                    : entityName,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiWhen")}
            value={
              action.when ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(when) =>
              onChange({
                ...action,
                when:
                  when.kind === "literal" && when.value === null
                    ? undefined
                    : when,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
        </div>
      );

    case "upsertAiRecordContext":
      return (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-sm">
            {t("dataHooks.actions.upsertAiRecordContextHint")}
          </Text>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.targetEntity")}
            value={
              action.entityName ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(entityName) =>
              onChange({
                ...action,
                entityName:
                  entityName.kind === "literal" && entityName.value === null
                    ? undefined
                    : entityName,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.recordId")}
            value={
              action.recordId ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(recordId) =>
              onChange({
                ...action,
                recordId:
                  recordId.kind === "literal" && recordId.value === null
                    ? undefined
                    : recordId,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.context")}
            value={action.context}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(context) => onChange({ ...action, context })}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.ragText")}
            value={
              action.ragText ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(ragText) =>
              onChange({
                ...action,
                ragText:
                  ragText.kind === "literal" && ragText.value === null
                    ? undefined
                    : ragText,
              })
            }
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={action.enqueueNarrative !== false}
              onChange={(event) =>
                onChange({
                  ...action,
                  enqueueNarrative: event.target.checked,
                })
              }
            />
            <Text className="text-sm">
              {t("dataHooks.actions.enqueueNarrative")}
            </Text>
          </label>
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.narrativeVariant")}
            </Text>
            <Input
              className={controlClassName}
              value={action.narrativeVariant ?? "default"}
              onChange={(event) =>
                onChange({
                  ...action,
                  narrativeVariant: event.target.value.trim() || undefined,
                })
              }
            />
          </label>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.narrativePrompt")}
            value={
              action.narrativePrompt ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(narrativePrompt) =>
              onChange({
                ...action,
                narrativePrompt:
                  narrativePrompt.kind === "literal" &&
                  narrativePrompt.value === null
                    ? undefined
                    : narrativePrompt,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.narrativeSystemInstruction")}
            value={
              action.narrativeSystemInstruction ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(narrativeSystemInstruction) =>
              onChange({
                ...action,
                narrativeSystemInstruction:
                  narrativeSystemInstruction.kind === "literal" &&
                  narrativeSystemInstruction.value === null
                    ? undefined
                    : narrativeSystemInstruction,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
        </div>
      );

    case "enqueueAiRecordNarrative":
      return (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-sm">
            {t("dataHooks.actions.enqueueAiRecordNarrativeHint")}
          </Text>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.targetEntity")}
            value={
              action.entityName ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(entityName) =>
              onChange({
                ...action,
                entityName:
                  entityName.kind === "literal" && entityName.value === null
                    ? undefined
                    : entityName,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.recordId")}
            value={
              action.recordId ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(recordId) =>
              onChange({
                ...action,
                recordId:
                  recordId.kind === "literal" && recordId.value === null
                    ? undefined
                    : recordId,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.narrativeVariant")}
            </Text>
            <Input
              className={controlClassName}
              value={action.variant ?? "default"}
              onChange={(event) =>
                onChange({
                  ...action,
                  variant: event.target.value.trim() || undefined,
                })
              }
            />
          </label>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiPrompt")}
            value={
              action.prompt ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(prompt) =>
              onChange({
                ...action,
                prompt:
                  prompt.kind === "literal" && prompt.value === null
                    ? undefined
                    : prompt,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.aiSystemInstruction")}
            value={
              action.systemInstruction ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(systemInstruction) =>
              onChange({
                ...action,
                systemInstruction:
                  systemInstruction.kind === "literal" &&
                  systemInstruction.value === null
                    ? undefined
                    : systemInstruction,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
        </div>
      );

    case "invalidateAiRecordNarratives":
      return (
        <div className="space-y-3">
          <Text className="text-muted-foreground text-sm">
            {t("dataHooks.actions.invalidateAiRecordNarrativesHint")}
          </Text>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.targetEntity")}
            value={
              action.entityName ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(entityName) =>
              onChange({
                ...action,
                entityName:
                  entityName.kind === "literal" && entityName.value === null
                    ? undefined
                    : entityName,
              })
            }
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.recordId")}
            value={
              action.recordId ?? {
                kind: "literal",
                value: null,
              }
            }
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(recordId) =>
              onChange({
                ...action,
                recordId:
                  recordId.kind === "literal" && recordId.value === null
                    ? undefined
                    : recordId,
              })
            }
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.narrativeVariant")}
            </Text>
            <Input
              className={controlClassName}
              value={action.variants.join(", ")}
              onChange={(event) =>
                onChange({
                  ...action,
                  variants: event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter((part) => part.length > 0),
                })
              }
            />
          </label>
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
        </div>
      );

    case "matchSimilarRecord":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.haystack")}
            defaultOpen
            value={action.haystack}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(haystack) => onChange({ ...action, haystack })}
          />
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.embeddingField")}
            </Text>
            <Input
              className={controlClassName}
              value={action.embeddingField}
              onChange={(event) =>
                onChange({ ...action, embeddingField: event.target.value })
              }
            />
          </label>
          <label className="block space-y-1">
            <Text className="text-sm font-medium">
              {t("dataHooks.actions.aiAs")}
            </Text>
            <Input
              className={controlClassName}
              value={action.as}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </label>
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.actions.matchSimilarHint")}
          </Text>
        </div>
      );

    case "createRecord":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
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
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.count")}
            defaultOpen
            value={action.count}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(count) => onChange({ ...action, count })}
          />
          <CollapsibleExpressionEditor
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
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.matchWhere")}
            defaultOpen
          >
            <DataHookConditionEditor
              value={action.where}
              fieldNames={getFieldNames(action.entity)}
              valueFieldNames={triggerFieldNames}
              suppressRootHeader
              onChange={(where) => onChange({ ...action, where })}
            />
          </CollapsibleSection>
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
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.matchWhere")}
            defaultOpen
          >
            <DataHookConditionEditor
              value={action.where}
              fieldNames={getFieldNames(action.entity)}
              valueFieldNames={triggerFieldNames}
              suppressRootHeader
              onChange={(where) => onChange({ ...action, where })}
            />
          </CollapsibleSection>
        </div>
      );

    case "deleteRecord":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.recordId")}
            defaultOpen
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
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.recordId")}
            defaultOpen
            value={action.id}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(id) => onChange({ ...action, id })}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.alias")}
            defaultOpen={Boolean(action.as)}
          >
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </CollapsibleSection>
        </div>
      );

    case "getOrCreateRecord":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.matchWhere")}
            defaultOpen
          >
            <DataHookConditionEditor
              value={action.where}
              fieldNames={getFieldNames(action.entity)}
              valueFieldNames={triggerFieldNames}
              suppressRootHeader
              onChange={(where) => onChange({ ...action, where })}
            />
          </CollapsibleSection>
          <Checkbox
            checked={action.createIfMissing !== false}
            label={t("dataHooks.actions.createIfMissing")}
            onChange={(event) => {
              const createIfMissing = event.target.checked;
              onChange({
                ...action,
                createIfMissing: createIfMissing ? undefined : false,
                data: createIfMissing ? (action.data ?? {}) : action.data,
              });
            }}
          />
          {action.createIfMissing !== false ? (
            <FieldMapEditor
              label={t("dataHooks.actions.recordData")}
              value={action.data ?? {}}
              fieldNames={getFieldNames(action.entity)}
              loadedBindings={loadedBindings}
              aggregateBindings={aggregateBindings}
              onChange={(data) => onChange({ ...action, data })}
            />
          ) : null}
          <Text className="text-muted-foreground text-xs">
            {t(
              action.createIfMissing === false
                ? "dataHooks.actions.getOrCreateRecordFindOnlyHint"
                : "dataHooks.actions.getOrCreateRecordHint",
            )}
          </Text>
          <CollapsibleSection
            title={t("dataHooks.actions.alias")}
            defaultOpen={Boolean(action.as)}
          >
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </CollapsibleSection>
        </div>
      );

    case "matchRelatedRecord":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.matchWhere")}
            defaultOpen
          >
            <DataHookConditionEditor
              value={action.where}
              fieldNames={getFieldNames(action.entity)}
              valueFieldNames={triggerFieldNames}
              suppressRootHeader
              onChange={(where) => onChange({ ...action, where })}
            />
          </CollapsibleSection>
          <CollapsibleExpressionEditor
            label={t("dataHooks.actions.haystack")}
            defaultOpen
            value={action.haystack}
            fieldNames={triggerFieldNames}
            loadedBindings={loadedBindings}
            aggregateBindings={aggregateBindings}
            onChange={(haystack) => onChange({ ...action, haystack })}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.aliasField")}
            defaultOpen
          >
            <Select
              className={`${controlClassName} w-full`}
              value={action.aliasField}
              onChange={(event) =>
                onChange({ ...action, aliasField: event.target.value })
              }
            >
              <option value="">{t("dataHooks.actions.selectField")}</option>
              {getFieldNames(action.entity).map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </Select>
          </CollapsibleSection>
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.actions.matchRelatedRecordHint")}
          </Text>
          <CollapsibleSection
            title={t("dataHooks.actions.alias")}
            defaultOpen={Boolean(action.as)}
          >
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </CollapsibleSection>
        </div>
      );

    case "aggregateMatching":
      return (
        <div className="space-y-3">
          <TargetEntitySelect
            label={t("dataHooks.actions.targetEntity")}
            value={action.entity}
            onChange={(entity) => onChange({ ...action, entity })}
            entityOptions={entityOptions}
          />
          <CollapsibleSection
            title={t("dataHooks.actions.matchWhere")}
            defaultOpen
          >
            <DataHookConditionEditor
              value={action.where}
              fieldNames={getFieldNames(action.entity)}
              valueFieldNames={triggerFieldNames}
              suppressRootHeader
              onChange={(where) => onChange({ ...action, where })}
            />
          </CollapsibleSection>
          <CollapsibleSection
            title={t("dataHooks.actions.aggregateOp")}
            defaultOpen
          >
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
          </CollapsibleSection>
          {action.op !== "count" ? (
            <CollapsibleSection
              title={t("dataHooks.actions.aggregateField")}
              defaultOpen={Boolean(action.field)}
            >
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
            </CollapsibleSection>
          ) : null}
          <CollapsibleSection
            title={t("dataHooks.actions.alias")}
            defaultOpen={Boolean(action.as)}
          >
            <Input
              value={action.as}
              placeholder={t("dataHooks.actions.aliasPlaceholder")}
              onChange={(event) =>
                onChange({ ...action, as: event.target.value })
              }
            />
          </CollapsibleSection>
        </div>
      );

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function emptyActionOfType(
  type: DataHookAction["type"],
): DataHookAction {
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
    case "getOrCreateRecord":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
        data: {},
        as: "record",
      };
    case "matchRelatedRecord":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
        haystack: literal(),
        aliasField: "",
        as: "related",
      };
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
    case "callAi":
      return {
        type,
        prompt: literal(),
        as: "aiResult",
      };
    case "computeEmbedding":
      return {
        type,
        text: literal(),
        as: "embedding",
      };
    case "computeRecordAiSummary":
      return {
        type,
        as: "recordAiSummary",
      };
    case "upsertAiRecordContext":
      return {
        type,
        context: literal(),
        as: "aiContext",
      };
    case "enqueueAiRecordNarrative":
      return {
        type,
        as: "narrativeJob",
      };
    case "invalidateAiRecordNarratives":
      return {
        type,
        variants: ["default"],
        as: "narrativeInvalidate",
      };
    case "matchSimilarRecord":
      return {
        type,
        entity: "",
        where: createDefaultConditionRoot(),
        haystack: literal(),
        embeddingField: "embedding",
        as: "similar",
      };
  }
}

export function DataHookActionsEditor({
  actions,
  triggerEntity,
  hookPhase,
  hookExecution,
  disabled,
  onChange,
  showAddButton = true,
}: {
  readonly actions: readonly DataHookAction[];
  readonly triggerEntity: string;
  readonly hookPhase: DataHookPhase;
  readonly hookExecution?: DataHookExecutionMode;
  readonly disabled: boolean;
  readonly onChange: (next: readonly DataHookAction[]) => void;
  readonly showAddButton?: boolean;
}) {
  const { t } = useTranslation("common");
  const getFieldNames = useEntityFieldNames();
  const triggerFieldNames = getFieldNames(triggerEntity);

  function updateAt(index: number, next: DataHookAction) {
    onChange(actions.map((action, i) => (i === index ? next : action)));
  }

  return (
    <div className="space-y-3">
      {actions.map((action, index) => (
        <CollapsibleEditorCard
          key={index}
          title={t(`dataHooks.actionType.${action.type}`)}
          defaultOpen={index === 0}
          className="bg-muted/20 shadow-sm"
          headerEnd={
            <IconButton
              type="button"
              size="sm"
              label={t("dataHooks.actions.remove")}
              disabled={disabled || actions.length <= 1}
              onClick={() => onChange(actions.filter((_, i) => i !== index))}
            >
              <Trash2 aria-hidden className="size-4" />
            </IconButton>
          }
        >
          <div className="space-y-3">
            <Select
              className={`${controlClassName} w-full max-w-xs`}
              value={action.type}
              disabled={disabled}
              aria-label={t("dataHooks.actions.title")}
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
        </CollapsibleEditorCard>
      ))}
      {showAddButton ? (
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
      ) : null}
    </div>
  );
}
