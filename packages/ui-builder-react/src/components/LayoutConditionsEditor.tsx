import { useMemo, useState } from "react";
import {
  formatConditionalRulePreview,
  type FieldDateDisplayFormat,
  type LayoutCondition,
  type LayoutConditionKind,
} from "@repo/ui-builder-core";
import { Button, IconButton, Input, Popover, Select, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import { STYLE_RULES_POPOVER_PANEL_CLASS } from "./StyleRulesPopoverTable.js";

const COMPARE_FIELD_DATE_FORMATS = [
  "date",
  "datetime",
  "time",
  "daysRemaining",
] as const satisfies readonly FieldDateDisplayFormat[];

const DASHBOARD_DATE_FILTER_MATCH_OPTIONS = ["currentPeriod"] as const;

export interface LayoutConditionsEditorLabels {
  readonly title: string;
  readonly hint?: string;
  readonly compareField?: string;
  readonly compareFieldHint?: string;
  readonly dateDisplayFormat?: string;
  readonly matchValue: string;
  readonly matchPath?: string;
  readonly matchPathPlaceholder?: string;
  readonly conditionKind?: string;
  readonly conditionKindField?: string;
  readonly conditionKindActivePath?: string;
  readonly conditionKindDashboardDateFilter?: string;
  readonly dashboardDateFilterHint?: string;
  readonly matchCurrentPeriod?: string;
  readonly preview: string;
  readonly addRule: string;
  readonly saveRule: string;
  readonly cancel: string;
  readonly removeRule: string;
}

export interface LayoutConditionsEditorProps {
  readonly conditions?: readonly LayoutCondition[];
  readonly onChange: (
    conditions: readonly LayoutCondition[] | undefined,
  ) => void;
  readonly labels: LayoutConditionsEditorLabels;
  readonly fieldOptions?: readonly FieldDescriptor[];
  readonly defaultCompareFieldPath?: string;
  readonly defaultCompareFieldDateFormat?: FieldDateDisplayFormat;
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function formatFieldOptionLabel(field: FieldDescriptor): string {
  return `${field.label} (${field.path})`;
}

function resolveConditionKind(condition: LayoutCondition): LayoutConditionKind {
  return condition.conditionKind ?? "field";
}

function isActivePathCondition(condition: LayoutCondition): boolean {
  return resolveConditionKind(condition) === "activePath";
}

function isDashboardDateFilterCondition(condition: LayoutCondition): boolean {
  return resolveConditionKind(condition) === "dashboardDateFilter";
}

function createDefaultCondition(
  fieldOptions: readonly FieldDescriptor[],
): LayoutCondition {
  if (fieldOptions.length === 0) {
    return {
      conditionKind: "dashboardDateFilter",
      matchValue: "currentPeriod",
    };
  }
  return { matchValue: "" };
}

function normalizeCondition(
  condition: LayoutCondition,
  defaultCompareFieldPath?: string,
): LayoutCondition {
  const kind = resolveConditionKind(condition);
  const matchValue = condition.matchValue.trim();

  if (kind === "activePath") {
    return {
      conditionKind: "activePath",
      matchValue,
    };
  }

  if (kind === "dashboardDateFilter") {
    return {
      conditionKind: "dashboardDateFilter",
      matchValue: matchValue.length > 0 ? matchValue : "currentPeriod",
    };
  }

  const explicitPath = condition.compareFieldPath?.trim();
  const defaultPath = defaultCompareFieldPath?.trim();
  const compareFieldPath =
    explicitPath && explicitPath !== defaultPath ? explicitPath : undefined;

  return {
    matchValue,
    ...(compareFieldPath ? { compareFieldPath } : {}),
    ...(condition.compareFieldDateFormat
      ? { compareFieldDateFormat: condition.compareFieldDateFormat }
      : {}),
  };
}

function resolveEffectiveCompareFieldPath(
  condition: LayoutCondition,
  defaultCompareFieldPath?: string,
): string | undefined {
  const explicit = condition.compareFieldPath?.trim();
  if (explicit) {
    return explicit;
  }
  const fallback = defaultCompareFieldPath?.trim();
  return fallback && fallback.length > 0 ? fallback : undefined;
}

function ConditionForm({
  draft,
  onChange,
  labels,
  fieldOptions,
  defaultCompareFieldPath,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  readonly draft: LayoutCondition;
  readonly onChange: (draft: LayoutCondition) => void;
  readonly labels: LayoutConditionsEditorLabels;
  readonly fieldOptions: readonly FieldDescriptor[];
  readonly defaultCompareFieldPath?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel: string;
}) {
  const kind = resolveConditionKind(draft);
  const allowFieldCondition = fieldOptions.length > 0;
  const effectiveCompareFieldPath = resolveEffectiveCompareFieldPath(
    draft,
    defaultCompareFieldPath,
  );
  const showCompareField = kind === "field" && allowFieldCondition;
  const isDateField =
    kind === "field" &&
    Boolean(
      fieldOptions.find((field) => field.path === effectiveCompareFieldPath)
        ?.valueType === "date",
    );
  const enumValues =
    kind === "field"
      ? (fieldOptions.find((field) => field.path === effectiveCompareFieldPath)
          ?.enumValues ?? [])
      : [];

  const hint =
    kind === "dashboardDateFilter"
      ? labels.dashboardDateFilterHint
      : kind === "activePath"
        ? undefined
        : labels.hint;

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          {labels.conditionKind ?? "Condition"}
        </span>
        <Select
          value={
            kind === "field" && !allowFieldCondition
              ? "dashboardDateFilter"
              : kind
          }
          onChange={(event) => {
            const nextKind = event.target.value as LayoutConditionKind;
            if (nextKind === "activePath") {
              onChange({
                conditionKind: "activePath",
                matchValue: draft.matchValue,
              });
              return;
            }
            if (nextKind === "dashboardDateFilter") {
              onChange({
                conditionKind: "dashboardDateFilter",
                matchValue:
                  draft.matchValue.trim().length > 0
                    ? draft.matchValue
                    : "currentPeriod",
              });
              return;
            }
            onChange({
              matchValue: draft.matchValue,
              ...(draft.compareFieldPath
                ? { compareFieldPath: draft.compareFieldPath }
                : {}),
              ...(draft.compareFieldDateFormat
                ? { compareFieldDateFormat: draft.compareFieldDateFormat }
                : {}),
            });
          }}
        >
          {allowFieldCondition ? (
            <option value="field">
              {labels.conditionKindField ?? "Field value"}
            </option>
          ) : null}
          <option value="activePath">
            {labels.conditionKindActivePath ?? "Active path"}
          </option>
          <option value="dashboardDateFilter">
            {labels.conditionKindDashboardDateFilter ?? "Dashboard date filter"}
          </option>
        </Select>
      </label>

      {showCompareField ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.compareField ?? "Compare field"}
          </span>
          <Select
            searchable
            value={effectiveCompareFieldPath ?? ""}
            onChange={(event) => {
              const nextPath = event.target.value.trim();
              const nextCompareFieldPath =
                nextPath.length > 0 &&
                nextPath !== defaultCompareFieldPath?.trim()
                  ? nextPath
                  : undefined;
              const nextIsDate =
                fieldOptions.find((field) => field.path === nextPath)
                  ?.valueType === "date";
              onChange({
                ...draft,
                compareFieldPath: nextCompareFieldPath,
                compareFieldDateFormat: nextIsDate
                  ? draft.compareFieldDateFormat
                  : undefined,
              });
            }}
          >
            <option value="">
              {defaultCompareFieldPath ??
                labels.compareField ??
                "Compare field"}
            </option>
            {fieldOptions.map((field) => (
              <option key={field.path} value={field.path}>
                {formatFieldOptionLabel(field)}
              </option>
            ))}
          </Select>
          {labels.compareFieldHint ? (
            <Text variant="muted" className="text-xs">
              {labels.compareFieldHint}
            </Text>
          ) : null}
        </label>
      ) : null}

      {isDateField ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.dateDisplayFormat ?? "Date format"}
          </span>
          <Select
            searchable
            value={draft.compareFieldDateFormat ?? "datetime"}
            onChange={(event) =>
              onChange({
                ...draft,
                compareFieldDateFormat: event.target
                  .value as FieldDateDisplayFormat,
              })
            }
          >
            {COMPARE_FIELD_DATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          {kind === "activePath"
            ? (labels.matchPath ?? labels.matchValue)
            : labels.matchValue}
        </span>
        {kind === "dashboardDateFilter" ? (
          <Select
            value={draft.matchValue || "currentPeriod"}
            onChange={(event) =>
              onChange({ ...draft, matchValue: event.target.value })
            }
          >
            {DASHBOARD_DATE_FILTER_MATCH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {labels.matchCurrentPeriod ?? value}
              </option>
            ))}
          </Select>
        ) : enumValues.length > 0 ? (
          <Select
            searchable
            value={draft.matchValue ?? ""}
            onChange={(event) =>
              onChange({ ...draft, matchValue: event.target.value })
            }
          >
            <option value="">{labels.matchValue}</option>
            {enumValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            value={draft.matchValue ?? ""}
            onChange={(event) =>
              onChange({ ...draft, matchValue: event.target.value })
            }
            placeholder={
              kind === "activePath"
                ? (labels.matchPathPlaceholder ?? "/app/transactions")
                : labels.matchValue
            }
          />
        )}
      </label>

      {hint ? (
        <Text variant="muted" className="text-xs">
          {hint}
        </Text>
      ) : null}

      <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button type="button" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export function LayoutConditionsEditor({
  conditions = [],
  onChange,
  labels,
  fieldOptions = [],
  defaultCompareFieldPath,
  defaultOpen = false,
  className,
}: LayoutConditionsEditorProps) {
  const [cardOpen, setCardOpen] = useState(
    defaultOpen || conditions.length > 0,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<LayoutCondition | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<LayoutCondition | null>(null);

  const fieldLabelByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of fieldOptions) {
      map.set(field.path, formatFieldOptionLabel(field));
    }
    return map;
  }, [fieldOptions]);

  const publish = (next: readonly LayoutCondition[]) => {
    onChange(next.length > 0 ? next : undefined);
  };

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      setCardOpen(true);
      setEditingIndex(null);
      setEditDraft(null);
      setAddDraft(createDefaultCondition(fieldOptions));
      return;
    }
    setAddDraft(null);
  };

  const confirmAdd = () => {
    if (!addDraft) {
      return;
    }
    publish([
      ...conditions,
      normalizeCondition(addDraft, defaultCompareFieldPath),
    ]);
    setAddOpen(false);
    setAddDraft(null);
  };

  const handleEditOpenChange = (index: number, open: boolean) => {
    if (open) {
      setCardOpen(true);
      setAddOpen(false);
      setAddDraft(null);
      setEditingIndex(index);
      setEditDraft({ ...conditions[index]! });
      return;
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  const confirmEdit = (index: number) => {
    if (!editDraft) {
      return;
    }
    publish(
      conditions.map((condition, conditionIndex) =>
        conditionIndex === index
          ? normalizeCondition(editDraft, defaultCompareFieldPath)
          : condition,
      ),
    );
    setEditingIndex(null);
    setEditDraft(null);
  };

  const formatConditionSummary = (condition: LayoutCondition): string => {
    if (isActivePathCondition(condition)) {
      return `path = ${condition.matchValue || "—"}`;
    }
    if (isDashboardDateFilterCondition(condition)) {
      return `dateFilter = ${condition.matchValue || "—"}`;
    }
    const comparePath = resolveEffectiveCompareFieldPath(
      condition,
      defaultCompareFieldPath,
    );
    if (!comparePath) {
      return condition.matchValue || "—";
    }
    const compareLabel = fieldLabelByPath.get(comparePath) ?? comparePath;
    return `${compareLabel} = ${condition.matchValue || "—"}`;
  };

  const addTrigger = (
    <Popover
      open={addOpen}
      onOpenChange={handleAddOpenChange}
      layer="elevated"
      placement="right-start"
      title={labels.addRule}
      panelClassName={STYLE_RULES_POPOVER_PANEL_CLASS}
      trigger={
        <IconButton type="button" label={labels.addRule} size="sm">
          <PlusIcon />
        </IconButton>
      }
    >
      {addDraft ? (
        <ConditionForm
          draft={addDraft}
          onChange={setAddDraft}
          labels={labels}
          fieldOptions={fieldOptions}
          defaultCompareFieldPath={defaultCompareFieldPath}
          onCancel={() => setAddOpen(false)}
          onConfirm={confirmAdd}
          confirmLabel={labels.addRule}
        />
      ) : null}
    </Popover>
  );

  return (
    <div className={className}>
      <CollapsibleEditorCard
        title={labels.title}
        open={cardOpen}
        onOpenChange={setCardOpen}
        addTrigger={addTrigger}
      >
        {labels.hint ? (
          <Text variant="muted" className="mb-2 text-xs">
            {labels.hint}
          </Text>
        ) : null}
        <div className="max-h-48 overflow-y-auto rounded-lg bg-background/60 shadow-inner">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {labels.matchValue}
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  {labels.preview}
                </th>
                <th className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {conditions.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground px-3 py-4 text-center"
                  >
                    —
                  </td>
                </tr>
              ) : (
                conditions.map((condition, index) => (
                  <tr
                    key={`${index}-${condition.conditionKind ?? "field"}-${condition.matchValue}-${condition.compareFieldPath ?? ""}`}
                    className="even:bg-muted/15 hover:bg-primary/5 transition-colors duration-150"
                  >
                    <td className="px-3 py-2">
                      {formatConditionSummary(condition)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {formatConditionalRulePreview(
                        condition,
                        resolveEffectiveCompareFieldPath(
                          condition,
                          defaultCompareFieldPath,
                        )
                          ? fieldLabelByPath.get(
                              resolveEffectiveCompareFieldPath(
                                condition,
                                defaultCompareFieldPath,
                              )!,
                            )
                          : undefined,
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Popover
                          open={editingIndex === index}
                          onOpenChange={(open) =>
                            handleEditOpenChange(index, open)
                          }
                          layer="elevated"
                          placement="right-start"
                          title={labels.saveRule}
                          panelClassName={STYLE_RULES_POPOVER_PANEL_CLASS}
                          trigger={
                            <IconButton
                              type="button"
                              label={labels.saveRule}
                              size="sm"
                            >
                              <PencilIcon />
                            </IconButton>
                          }
                        >
                          {editDraft && editingIndex === index ? (
                            <ConditionForm
                              draft={editDraft}
                              onChange={setEditDraft}
                              labels={labels}
                              fieldOptions={fieldOptions}
                              defaultCompareFieldPath={defaultCompareFieldPath}
                              onCancel={() =>
                                handleEditOpenChange(index, false)
                              }
                              onConfirm={() => confirmEdit(index)}
                              confirmLabel={labels.saveRule}
                            />
                          ) : null}
                        </Popover>
                        <IconButton
                          type="button"
                          label={labels.removeRule}
                          size="sm"
                          onClick={() =>
                            publish(
                              conditions.filter(
                                (_, conditionIndex) => conditionIndex !== index,
                              ),
                            )
                          }
                        >
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleEditorCard>
    </div>
  );
}
