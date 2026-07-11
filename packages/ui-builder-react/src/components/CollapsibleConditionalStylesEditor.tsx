import { useMemo, useState } from "react";
import {
  formatConditionalRulePreview,
  type ConditionalStyleRule,
  type FieldDateDisplayFormat,
} from "@repo/ui-builder-core";
import { Button, IconButton, Input, Popover, Select, Text } from "@repo/ui";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  STYLE_RULES_POPOVER_PANEL_CLASS,
  useStyleRulesPopoverEditor,
} from "./StyleRulesPopoverTable.js";

const BADGE_VARIANTS = [
  "success",
  "warning",
  "danger",
  "info",
  "default",
  "active",
  "pending",
  "closed",
  "neutral",
] as const;

const WIZARD_STEP_STATUS_OPTIONS = [
  "pending",
  "active",
  "completed",
  "invalid",
] as const;

const COMPARE_FIELD_DATE_FORMATS = [
  "date",
  "datetime",
  "time",
  "daysRemaining",
] as const satisfies readonly FieldDateDisplayFormat[];

export interface CollapsibleConditionalStylesEditorLabels {
  readonly compareField?: string;
  readonly compareFieldHint?: string;
  readonly dateDisplayFormat?: string;
  readonly matchValue: string;
  readonly matchPath?: string;
  readonly matchPathPlaceholder?: string;
  readonly conditionKind?: string;
  readonly conditionKindField?: string;
  readonly conditionKindActivePath?: string;
  readonly activePathHint?: string;
  readonly preview: string;
  readonly addRule: string;
  readonly saveRule: string;
  readonly cancel: string;
  readonly removeRule: string;
  readonly stylesWhenMatched: string;
  readonly badgeVariant?: string;
  readonly styleRules: StyleRulesEditorLabels;
}

export type CollapsibleConditionalStylesEditorMode =
  | "field"
  | "badge"
  | "wizard-status";

export interface CollapsibleConditionalStylesEditorProps {
  readonly title: string;
  readonly rules?: readonly ConditionalStyleRule[];
  readonly onChange: (rules: readonly ConditionalStyleRule[]) => void;
  readonly labels: CollapsibleConditionalStylesEditorLabels;
  readonly mode: CollapsibleConditionalStylesEditorMode;
  readonly fieldOptions?: readonly FieldDescriptor[];
  readonly defaultCompareFieldPath?: string;
  readonly defaultCompareFieldDateFormat?: FieldDateDisplayFormat;
  readonly hint?: string;
  readonly daysRemainingHint?: string;
  readonly defaultOpen?: boolean;
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

function createDefaultRule(
  mode: CollapsibleConditionalStylesEditorMode,
  fieldOptions: readonly FieldDescriptor[],
): ConditionalStyleRule {
  if (mode === "wizard-status") {
    return { matchValue: "active", styles: [] };
  }
  const preferActivePath = fieldOptions.length === 0;
  if (mode === "badge") {
    return preferActivePath
      ? {
          conditionKind: "activePath",
          matchValue: "",
          badgeVariant: "default",
          styles: [],
        }
      : { matchValue: "", badgeVariant: "default", styles: [] };
  }
  return preferActivePath
    ? { conditionKind: "activePath", matchValue: "", styles: [] }
    : { matchValue: "", styles: [] };
}

function isActivePathRule(rule: ConditionalStyleRule): boolean {
  return rule.conditionKind === "activePath";
}

function normalizeRuleCompareField(
  rule: ConditionalStyleRule,
  defaultCompareFieldPath?: string,
): ConditionalStyleRule {
  if (isActivePathRule(rule)) {
    const {
      compareFieldPath: _path,
      compareFieldDateFormat: _format,
      ...rest
    } = rule;
    void _path;
    void _format;
    return rest;
  }

  const explicitPath = rule.compareFieldPath?.trim();
  const defaultPath = defaultCompareFieldPath?.trim();

  if (!explicitPath || explicitPath === defaultPath) {
    const { compareFieldPath: _removed, ...rest } = rule;
    void _removed;
    return rest;
  }

  return { ...rule, compareFieldPath: explicitPath };
}

function resolveDefaultDateFormatForPath(
  comparePath: string | undefined,
  fieldOptions: readonly FieldDescriptor[],
  defaultCompareFieldPath?: string,
  defaultCompareFieldDateFormat?: FieldDateDisplayFormat,
): FieldDateDisplayFormat | undefined {
  if (!comparePath) {
    return undefined;
  }

  if (
    defaultCompareFieldDateFormat &&
    comparePath === defaultCompareFieldPath?.trim()
  ) {
    return defaultCompareFieldDateFormat;
  }

  const field = fieldOptions.find((option) => option.path === comparePath);
  if (field?.valueType !== "date") {
    return undefined;
  }

  return field.dateDisplayFormat ?? "datetime";
}

function resolveEffectiveCompareFieldDateFormat(
  rule: ConditionalStyleRule,
  fieldOptions: readonly FieldDescriptor[],
  defaultCompareFieldPath?: string,
  defaultCompareFieldDateFormat?: FieldDateDisplayFormat,
): FieldDateDisplayFormat | undefined {
  if (rule.compareFieldDateFormat) {
    return rule.compareFieldDateFormat;
  }

  return resolveDefaultDateFormatForPath(
    resolveEffectiveCompareFieldPath(rule, defaultCompareFieldPath),
    fieldOptions,
    defaultCompareFieldPath,
    defaultCompareFieldDateFormat,
  );
}

function normalizeConditionalStyleRule(
  rule: ConditionalStyleRule,
  fieldOptions: readonly FieldDescriptor[],
  defaultCompareFieldPath?: string,
  defaultCompareFieldDateFormat?: FieldDateDisplayFormat,
): ConditionalStyleRule {
  let next =
    fieldOptions.length === 0 && rule.conditionKind !== "activePath"
      ? { ...rule, conditionKind: "activePath" as const }
      : rule;

  next = normalizeRuleCompareField(next, defaultCompareFieldPath);

  if (isActivePathRule(next)) {
    return {
      ...next,
      conditionKind: "activePath",
      matchValue: next.matchValue.trim(),
    };
  }

  if (next.conditionKind === "field") {
    const { conditionKind: _kind, ...rest } = next;
    void _kind;
    next = rest;
  }

  const comparePath = resolveEffectiveCompareFieldPath(
    next,
    defaultCompareFieldPath,
  );
  const defaultFormat = resolveDefaultDateFormatForPath(
    comparePath,
    fieldOptions,
    defaultCompareFieldPath,
    defaultCompareFieldDateFormat,
  );

  if (
    !next.compareFieldDateFormat ||
    next.compareFieldDateFormat === defaultFormat
  ) {
    const { compareFieldDateFormat: _removed, ...rest } = next;
    void _removed;
    next = rest;
  }

  return next;
}

function isDateCompareFieldPath(
  comparePath: string | undefined,
  fieldOptions: readonly FieldDescriptor[],
): boolean {
  if (!comparePath) {
    return false;
  }
  return (
    fieldOptions.find((option) => option.path === comparePath)?.valueType ===
    "date"
  );
}

function resolveCompareFieldEnumValues(
  comparePath: string | undefined,
  fieldOptions: readonly FieldDescriptor[],
): readonly string[] {
  if (!comparePath) {
    return [];
  }

  return (
    fieldOptions.find((option) => option.path === comparePath)?.enumValues ?? []
  );
}

function resolveCompareFieldLabel(
  path: string | undefined,
  fieldOptions: readonly FieldDescriptor[],
): string | undefined {
  if (!path) {
    return undefined;
  }
  const field = fieldOptions.find((option) => option.path === path);
  return field ? formatFieldOptionLabel(field) : path;
}

function resolveEffectiveCompareFieldPath(
  rule: ConditionalStyleRule,
  defaultCompareFieldPath?: string,
): string | undefined {
  const explicit = rule.compareFieldPath?.trim();
  if (explicit) {
    return explicit;
  }
  const fallback = defaultCompareFieldPath?.trim();
  return fallback && fallback.length > 0 ? fallback : undefined;
}

function resolveRuleHint(
  rule: ConditionalStyleRule,
  fieldOptions: readonly FieldDescriptor[],
  defaultCompareFieldPath: string | undefined,
  defaultCompareFieldDateFormat: FieldDateDisplayFormat | undefined,
  hint: string | undefined,
  daysRemainingHint: string | undefined,
): string | undefined {
  const effectiveDateFormat = resolveEffectiveCompareFieldDateFormat(
    rule,
    fieldOptions,
    defaultCompareFieldPath,
    defaultCompareFieldDateFormat,
  );

  if (effectiveDateFormat === "daysRemaining") {
    return daysRemainingHint ?? hint;
  }

  return hint;
}

interface ConditionalRuleFormProps {
  readonly draft: ConditionalStyleRule;
  readonly onChange: (draft: ConditionalStyleRule) => void;
  readonly mode: CollapsibleConditionalStylesEditorMode;
  readonly labels: CollapsibleConditionalStylesEditorLabels;
  readonly fieldOptions: readonly FieldDescriptor[];
  readonly defaultCompareFieldPath?: string;
  readonly defaultCompareFieldDateFormat?: FieldDateDisplayFormat;
  readonly hint?: string;
  readonly daysRemainingHint?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel: string;
}

function ConditionalRuleForm({
  draft,
  onChange,
  mode,
  labels,
  fieldOptions,
  defaultCompareFieldPath,
  defaultCompareFieldDateFormat,
  hint,
  daysRemainingHint,
  onCancel,
  onConfirm,
  confirmLabel,
}: ConditionalRuleFormProps) {
  const { addTrigger, table } = useStyleRulesPopoverEditor({
    styles: draft.styles ?? [],
    onChange: (styles) => onChange({ ...draft, styles }),
    labels: labels.styleRules,
  });

  const effectiveCompareFieldPath = resolveEffectiveCompareFieldPath(
    draft,
    defaultCompareFieldPath,
  );
  const showDateFormat =
    !isActivePathRule(draft) &&
    isDateCompareFieldPath(effectiveCompareFieldPath, fieldOptions);
  const defaultDateFormat = resolveDefaultDateFormatForPath(
    effectiveCompareFieldPath,
    fieldOptions,
    defaultCompareFieldPath,
    defaultCompareFieldDateFormat,
  );
  const effectiveDateFormat =
    resolveEffectiveCompareFieldDateFormat(
      draft,
      fieldOptions,
      defaultCompareFieldPath,
      defaultCompareFieldDateFormat,
    ) ?? "datetime";
  const ruleHint = isActivePathRule(draft)
    ? (labels.activePathHint ?? hint)
    : resolveRuleHint(
        draft,
        fieldOptions,
        defaultCompareFieldPath,
        defaultCompareFieldDateFormat,
        hint,
        daysRemainingHint,
      );
  const allowConditionKindSelect = mode !== "wizard-status";
  const allowFieldCondition = fieldOptions.length > 0;
  const showCompareField =
    !isActivePathRule(draft) &&
    mode !== "wizard-status" &&
    fieldOptions.length > 0;
  const compareFieldEnumValues = resolveCompareFieldEnumValues(
    effectiveCompareFieldPath,
    fieldOptions,
  );
  const showEnumMatchValue =
    !isActivePathRule(draft) &&
    mode !== "wizard-status" &&
    compareFieldEnumValues.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {allowConditionKindSelect ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.conditionKind ?? "Condition"}
          </span>
          <Select
            value={
              isActivePathRule(draft) || !allowFieldCondition
                ? "activePath"
                : "field"
            }
            onChange={(event) => {
              const nextKind = event.target.value;
              if (nextKind === "activePath") {
                const {
                  compareFieldPath: _path,
                  compareFieldDateFormat: _format,
                  ...rest
                } = draft;
                void _path;
                void _format;
                onChange({
                  ...rest,
                  conditionKind: "activePath",
                });
                return;
              }
              const { conditionKind: _kind, ...rest } = draft;
              void _kind;
              onChange(rest);
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
          </Select>
        </label>
      ) : null}

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
              const nextIsDate = isDateCompareFieldPath(nextPath, fieldOptions);
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
              {defaultCompareFieldPath
                ? (resolveCompareFieldLabel(
                    defaultCompareFieldPath,
                    fieldOptions,
                  ) ?? defaultCompareFieldPath)
                : (labels.compareField ?? "Compare field")}
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

      {showDateFormat ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.dateDisplayFormat ?? "Date format"}
          </span>
          <Select
            searchable
            value={effectiveDateFormat}
            onChange={(event) => {
              const nextFormat = event.target.value as FieldDateDisplayFormat;
              onChange({
                ...draft,
                compareFieldDateFormat:
                  defaultDateFormat && nextFormat === defaultDateFormat
                    ? undefined
                    : nextFormat,
              });
            }}
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
          {isActivePathRule(draft)
            ? (labels.matchPath ?? labels.matchValue)
            : labels.matchValue}
        </span>
        {mode === "wizard-status" ? (
          <Select
            searchable
            value={draft.matchValue ?? ""}
            onChange={(event) =>
              onChange({ ...draft, matchValue: event.target.value })
            }
          >
            <option value="">{labels.matchValue}</option>
            {WIZARD_STEP_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        ) : showEnumMatchValue ? (
          <Select
            searchable
            value={draft.matchValue ?? ""}
            onChange={(event) =>
              onChange({ ...draft, matchValue: event.target.value })
            }
          >
            <option value="">{labels.matchValue}</option>
            {compareFieldEnumValues.map((value) => (
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
              isActivePathRule(draft)
                ? (labels.matchPathPlaceholder ?? "/app/transactions")
                : labels.matchValue
            }
          />
        )}
      </label>

      {mode === "badge" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {labels.badgeVariant ?? "Badge variant"}
          </span>
          <Select
            searchable
            value={draft.badgeVariant ?? "default"}
            onChange={(event) =>
              onChange({
                ...draft,
                badgeVariant: event.target
                  .value as ConditionalStyleRule["badgeVariant"],
              })
            }
          >
            {BADGE_VARIANTS.map((variant) => (
              <option key={variant} value={variant}>
                {variant}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {ruleHint ? (
        <Text variant="muted" className="text-xs">
          {ruleHint}
        </Text>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Text className="text-muted-foreground text-sm">
            {labels.stylesWhenMatched}
          </Text>
          {addTrigger}
        </div>
        {table}
      </div>

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

export function CollapsibleConditionalStylesEditor({
  title,
  rules = [],
  onChange,
  labels,
  mode,
  fieldOptions = [],
  defaultCompareFieldPath,
  defaultCompareFieldDateFormat,
  hint,
  daysRemainingHint,
  defaultOpen = false,
}: CollapsibleConditionalStylesEditorProps) {
  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<ConditionalStyleRule | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ConditionalStyleRule | null>(null);

  const fieldLabelByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of fieldOptions) {
      map.set(field.path, formatFieldOptionLabel(field));
    }
    if (defaultCompareFieldPath) {
      map.set(
        defaultCompareFieldPath,
        resolveCompareFieldLabel(defaultCompareFieldPath, fieldOptions) ??
          defaultCompareFieldPath,
      );
    }
    return map;
  }, [defaultCompareFieldPath, fieldOptions]);

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      setCardOpen(true);
      setEditingIndex(null);
      setEditDraft(null);
      setAddDraft(createDefaultRule(mode, fieldOptions));
      return;
    }
    setAddDraft(null);
  };

  const confirmAdd = () => {
    if (!addDraft) {
      return;
    }
    onChange([
      ...rules,
      normalizeConditionalStyleRule(
        addDraft,
        fieldOptions,
        defaultCompareFieldPath,
        defaultCompareFieldDateFormat,
      ),
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
      setEditDraft({ ...rules[index]!, styles: rules[index]?.styles ?? [] });
      return;
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  const confirmEdit = (index: number) => {
    if (!editDraft) {
      return;
    }
    onChange(
      rules.map((rule, ruleIndex) =>
        ruleIndex === index
          ? normalizeConditionalStyleRule(
              editDraft,
              fieldOptions,
              defaultCompareFieldPath,
              defaultCompareFieldDateFormat,
            )
          : rule,
      ),
    );
    setEditingIndex(null);
    setEditDraft(null);
  };

  const formatRuleMatchSummary = (rule: ConditionalStyleRule): string => {
    if (isActivePathRule(rule)) {
      return `path = ${rule.matchValue || "—"}`;
    }
    const comparePath = resolveEffectiveCompareFieldPath(
      rule,
      defaultCompareFieldPath,
    );
    if (!comparePath) {
      return rule.matchValue || "—";
    }
    const compareLabel = fieldLabelByPath.get(comparePath) ?? comparePath;
    return `${compareLabel} = ${rule.matchValue || "—"}`;
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
        <ConditionalRuleForm
          draft={addDraft}
          onChange={setAddDraft}
          mode={mode}
          labels={labels}
          fieldOptions={fieldOptions}
          defaultCompareFieldPath={defaultCompareFieldPath}
          defaultCompareFieldDateFormat={defaultCompareFieldDateFormat}
          hint={hint}
          daysRemainingHint={daysRemainingHint}
          onCancel={() => setAddOpen(false)}
          onConfirm={confirmAdd}
          confirmLabel={labels.addRule}
        />
      ) : null}
    </Popover>
  );

  return (
    <CollapsibleEditorCard
      title={title}
      open={cardOpen}
      onOpenChange={setCardOpen}
      addTrigger={addTrigger}
    >
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
            {rules.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="text-muted-foreground px-3 py-4 text-center"
                >
                  —
                </td>
              </tr>
            ) : (
              rules.map((rule, index) => (
                <tr
                  key={`${index}-${rule.matchValue}-${rule.compareFieldPath ?? ""}`}
                  className="even:bg-muted/15 hover:bg-primary/5 transition-colors duration-150"
                >
                  <td className="px-3 py-2">{formatRuleMatchSummary(rule)}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatConditionalRulePreview(
                      rule,
                      resolveCompareFieldLabel(
                        resolveEffectiveCompareFieldPath(
                          rule,
                          defaultCompareFieldPath,
                        ),
                        fieldOptions,
                      ),
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
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
                          <ConditionalRuleForm
                            draft={editDraft}
                            onChange={setEditDraft}
                            mode={mode}
                            labels={labels}
                            fieldOptions={fieldOptions}
                            defaultCompareFieldPath={defaultCompareFieldPath}
                            defaultCompareFieldDateFormat={
                              defaultCompareFieldDateFormat
                            }
                            hint={hint}
                            daysRemainingHint={daysRemainingHint}
                            onCancel={() => handleEditOpenChange(index, false)}
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
                          onChange(
                            rules.filter((_, ruleIndex) => ruleIndex !== index),
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
  );
}
