import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  DataHookConditionCombinator,
  DataHookConditionGroup,
  DataHookConditionLeaf,
  DataHookConditionNode,
} from "@repo/hooks";
import {
  DATA_HOOK_CONDITION_OPERATORS,
  VALUELESS_CONDITION_OPERATORS,
} from "@repo/hooks";
import { Button, FieldLabel, Select, Text } from "@repo/ui";

import { ExpressionEditor } from "./ExpressionEditor";
import { ConditionArrayValueEditor } from "./ConditionArrayValueEditor";
import {
  addChildAtPath,
  createEmptyConditionGroup,
  createEmptyConditionLeaf,
  pathKey,
  removeNodeAtPath,
  updateLeafAtPath,
  updateNodeAtPath,
  type DataHookConditionPath,
} from "./data-hook-condition-utils";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

function FilterCollapsibleHeader({
  expanded,
  onToggle,
  title,
  summary,
  actions,
}: {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly title: string;
  readonly summary?: string;
  readonly actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-2 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 space-y-0.5">
          <Text className="text-sm font-medium">{title}</Text>
          {!expanded && summary ? (
            <Text className="text-muted-foreground truncate text-xs">
              {summary}
            </Text>
          ) : null}
        </div>
      </button>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function ConditionLeafEditor({
  leaf,
  fieldNames,
  valueFieldNames,
  disabled,
  onChange,
  onRemove,
  showRemove,
}: {
  readonly leaf: DataHookConditionLeaf;
  readonly fieldNames: readonly string[];
  readonly valueFieldNames: readonly string[];
  readonly disabled?: boolean;
  readonly onChange: (patch: Partial<DataHookConditionLeaf>) => void;
  readonly onRemove?: () => void;
  readonly showRemove?: boolean;
}) {
  const { t } = useTranslation("common");
  const usesArrayValue = leaf.operator === "in" || leaf.operator === "notIn";

  function handleChange(patch: Partial<DataHookConditionLeaf>) {
    if (patch.operator && patch.operator !== leaf.operator) {
      const nextUsesArray =
        patch.operator === "in" || patch.operator === "notIn";
      if (nextUsesArray && !usesArrayValue) {
        onChange({
          ...patch,
          value: { kind: "literal", value: [""] },
        });
        return;
      }
      if (!nextUsesArray && usesArrayValue) {
        onChange({
          ...patch,
          value: { kind: "literal", value: "" },
        });
        return;
      }
    }
    onChange(patch);
  }

  return (
    <div className="border-border space-y-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <FieldLabel>{t("dataHooks.condition.leaf")}</FieldLabel>
        {showRemove && onRemove ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onRemove}
          >
            {t("dataHooks.condition.remove")}
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Select
          className={`${controlClassName} w-40`}
          value={leaf.field}
          disabled={disabled}
          onChange={(event) => handleChange({ field: event.target.value })}
        >
          <option value="">{t("dataHooks.actions.selectField")}</option>
          {!fieldNames.includes(leaf.field) && leaf.field ? (
            <option value={leaf.field}>{leaf.field}</option>
          ) : null}
          {fieldNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          className={`${controlClassName} w-36`}
          value={leaf.operator}
          disabled={disabled}
          onChange={(event) =>
            handleChange({
              operator: event.target.value as DataHookConditionLeaf["operator"],
            })
          }
        >
          {DATA_HOOK_CONDITION_OPERATORS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </Select>
      </div>
      {VALUELESS_CONDITION_OPERATORS.includes(
        leaf.operator,
      ) ? null : usesArrayValue ? (
        <ConditionArrayValueEditor
          value={
            leaf.value?.kind === "literal"
              ? leaf.value
              : { kind: "literal", value: [""] }
          }
          disabled={disabled}
          onChange={(value) => handleChange({ value })}
        />
      ) : (
        <ExpressionEditor
          label={t("dataHooks.actions.matchValue")}
          value={leaf.value ?? { kind: "literal", value: "" }}
          fieldNames={valueFieldNames}
          onChange={(value) => handleChange({ value })}
        />
      )}
    </div>
  );
}

function ConditionGroupEditor({
  root,
  path,
  fieldNames,
  valueFieldNames,
  rootTitle,
  disabled,
  isRoot = false,
  depth = 0,
  onChange,
}: {
  readonly root: DataHookConditionNode;
  readonly path: DataHookConditionPath;
  readonly fieldNames: readonly string[];
  readonly valueFieldNames: readonly string[];
  readonly rootTitle?: string;
  readonly disabled?: boolean;
  readonly isRoot?: boolean;
  readonly depth?: number;
  readonly onChange: (next: DataHookConditionNode) => void;
}) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(true);

  const node = path.length === 0 ? root : getGroupAtPath(root, path);
  if (!node || node.type !== "group") {
    return null;
  }
  const group = node;

  const combinatorLabel = t(`dataHooks.condition.${group.combinator}`);
  const childCount = group.children.length;
  const groupSummary =
    childCount === 0
      ? combinatorLabel
      : t("dataHooks.condition.groupSummary", {
          combinator: combinatorLabel,
          count: childCount,
        });

  const combinatorSelect = (
    <Select
      className={`${controlClassName} w-auto min-w-[8rem]`}
      value={group.combinator}
      disabled={disabled}
      onChange={(event) =>
        onChange(
          updateNodeAtPath(root, path, (current) => {
            if (current.type !== "group") {
              return current;
            }
            return {
              ...current,
              combinator: event.target.value as DataHookConditionCombinator,
            };
          }),
        )
      }
    >
      <option value="and">{t("dataHooks.condition.and")}</option>
      <option value="or">{t("dataHooks.condition.or")}</option>
    </Select>
  );

  return (
    <div
      className={
        isRoot ? "space-y-3" : "border-border rounded-md border p-3 pl-4"
      }
      style={
        !isRoot && depth > 0 ? { marginLeft: `${depth * 0.5}rem` } : undefined
      }
    >
      <FilterCollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        title={
          isRoot
            ? (rootTitle ?? t("dataHooks.settings.condition"))
            : t("dataHooks.condition.group")
        }
        summary={groupSummary}
        actions={
          <>
            {expanded ? combinatorSelect : null}
            {!isRoot ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(removeNodeAtPath(root, path))}
              >
                {t("dataHooks.condition.remove")}
              </Button>
            ) : null}
          </>
        }
      />

      {expanded ? (
        <div className="mt-3 space-y-3">
          {group.children.length === 0 ? (
            <Text className="text-muted-foreground text-sm">
              {t("dataHooks.condition.empty")}
            </Text>
          ) : (
            <div className="space-y-3">
              {group.children.map((child, index) => {
                const childPath = [...path, index];
                if (child.type === "group") {
                  return (
                    <ConditionGroupEditor
                      key={pathKey(childPath)}
                      root={root}
                      path={childPath}
                      fieldNames={fieldNames}
                      valueFieldNames={valueFieldNames}
                      disabled={disabled}
                      depth={depth + 1}
                      onChange={onChange}
                    />
                  );
                }

                return (
                  <ConditionLeafEditor
                    key={pathKey(childPath)}
                    leaf={child}
                    fieldNames={fieldNames}
                    valueFieldNames={valueFieldNames}
                    disabled={disabled}
                    showRemove
                    onChange={(patch) =>
                      onChange(updateLeafAtPath(root, childPath, patch))
                    }
                    onRemove={() => onChange(removeNodeAtPath(root, childPath))}
                  />
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onChange(
                  addChildAtPath(
                    root,
                    path,
                    createEmptyConditionLeaf(fieldNames[0] ?? ""),
                  ),
                )
              }
            >
              {t("dataHooks.condition.addCondition")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onChange(
                  addChildAtPath(root, path, createEmptyConditionGroup("and")),
                )
              }
            >
              {t("dataHooks.condition.addGroup")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getGroupAtPath(
  root: DataHookConditionNode,
  path: DataHookConditionPath,
): DataHookConditionGroup | null {
  let current: DataHookConditionNode = root;
  for (const index of path) {
    if (current.type !== "group") {
      return null;
    }
    const child = current.children[index];
    if (!child) {
      return null;
    }
    current = child;
  }
  return current.type === "group" ? current : null;
}

interface DataHookConditionEditorProps {
  readonly value: DataHookConditionNode;
  readonly fieldNames: readonly string[];
  readonly valueFieldNames?: readonly string[];
  readonly rootTitle?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: DataHookConditionNode) => void;
}

export function DataHookConditionEditor({
  value,
  fieldNames,
  valueFieldNames = fieldNames,
  rootTitle,
  disabled = false,
  onChange,
}: DataHookConditionEditorProps) {
  if (value.type === "condition") {
    return (
      <ConditionLeafEditor
        leaf={value}
        fieldNames={fieldNames}
        valueFieldNames={valueFieldNames}
        disabled={disabled}
        onChange={(patch) => onChange({ ...value, ...patch })}
      />
    );
  }

  return (
    <ConditionGroupEditor
      root={value}
      path={[]}
      fieldNames={fieldNames}
      valueFieldNames={valueFieldNames}
      rootTitle={rootTitle}
      disabled={disabled}
      isRoot
      onChange={onChange}
    />
  );
}
