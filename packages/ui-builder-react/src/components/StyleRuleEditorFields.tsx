import { useMemo, useState } from "react";
import {
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_GRID_STYLE_PROPERTIES,
  STYLE_PROPERTY_OPTIONS,
  type ResponsiveGridBreakpoint,
  type StylePropertyKey,
  type StyleRule,
  type StyleRuleValue,
  type ThemeColorRole,
} from "@repo/ui-builder-core";
import { Button, IconButton, Input, Select } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  coerceNumericStyleValue,
  defaultValueForProperty,
  enumOptionsForProperty,
  formatStyleRuleValuePreview,
  isBackdropFilterStyleProperty,
  isColorStyleProperty,
  isDimensionStyleProperty,
  isEnumStyleProperty,
  isNumericStyleProperty,
  isShadowStyleProperty,
  isTypographyStyleProperty,
  numericStyleInputMin,
} from "./style-rules-state.js";
import { ColorValueEditor } from "./ColorValueEditor.js";
import { ShadowValueEditor } from "./ShadowValueEditor.js";
import { ThemeOrPixelValueEditor } from "./ThemeOrPixelValueEditor.js";
import { TypographyValueEditor } from "./TypographyValueEditor.js";

function formatPropertyLabel(property: StylePropertyKey): string {
  return property
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function colorRoleForProperty(property: StylePropertyKey): ThemeColorRole {
  if (property === "color") {
    return "text";
  }
  if (property === "borderColor") {
    return "border";
  }
  return "background";
}

function ruleForValueEditor(
  rule: StyleRule,
  value: StyleRuleValue | undefined,
): StyleRule {
  return {
    property: rule.property,
    value: value ?? defaultValueForProperty(rule.property),
  };
}

function StyleRuleValueInput({
  rule,
  value,
  labels,
  onChangeValue,
}: {
  readonly rule: StyleRule;
  readonly value: StyleRuleValue | undefined;
  readonly labels: StyleRulesEditorLabels;
  readonly onChangeValue: (value: StyleRuleValue | undefined) => void;
}) {
  const editorRule = ruleForValueEditor(rule, value);
  const patchValue = (next: StyleRuleValue) => onChangeValue(next);

  if (isColorStyleProperty(rule.property)) {
    return (
      <ColorValueEditor
        value={String(editorRule.value)}
        onChange={patchValue}
        labels={labels}
        colorRole={colorRoleForProperty(rule.property)}
      />
    );
  }

  if (isShadowStyleProperty(rule.property)) {
    return (
      <ShadowValueEditor
        value={String(editorRule.value)}
        onChange={patchValue}
        labels={labels}
      />
    );
  }

  if (isBackdropFilterStyleProperty(rule.property)) {
    return (
      <Input
        value={String(editorRule.value ?? "")}
        onChange={(event) => patchValue(event.target.value)}
        placeholder="blur(8px)"
      />
    );
  }

  if (isTypographyStyleProperty(rule.property)) {
    return (
      <TypographyValueEditor
        value={String(editorRule.value)}
        onChange={patchValue}
        labels={labels}
      />
    );
  }

  if (isDimensionStyleProperty(rule.property)) {
    return (
      <ThemeOrPixelValueEditor
        property={rule.property}
        value={String(editorRule.value)}
        onChange={patchValue}
        labels={labels}
      />
    );
  }

  if (isEnumStyleProperty(rule.property)) {
    return (
      <Select
        searchable
        value={String(editorRule.value)}
        onChange={(event) => patchValue(event.target.value)}
      >
        {enumOptionsForProperty(rule.property).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (isNumericStyleProperty(rule.property)) {
    return (
      <Input
        type="number"
        min={numericStyleInputMin(rule.property)}
        max={rule.property === "opacity" ? 100 : undefined}
        step={1}
        value={String(editorRule.value ?? "")}
        onChange={(event) =>
          patchValue(
            coerceNumericStyleValue(rule.property, event.target.value),
          )
        }
      />
    );
  }

  return (
    <Input
      value={String(editorRule.value ?? "")}
      onChange={(event) => patchValue(event.target.value)}
    />
  );
}

const BREAKPOINT_SHORT_LABEL_KEYS: Record<
  ResponsiveGridBreakpoint,
  keyof StyleRulesEditorLabels
> = {
  base: "styleBreakpointShortBase",
  sm: "styleBreakpointShortSm",
  md: "styleBreakpointShortMd",
  lg: "styleBreakpointShortLg",
  xl: "styleBreakpointShortXl",
};

const BREAKPOINT_FALLBACK_LABELS: Record<ResponsiveGridBreakpoint, string> = {
  base: "Mobile",
  sm: "SM",
  md: "MD",
  lg: "LG",
  xl: "XL",
};

function supportsResponsiveValues(property: StylePropertyKey): boolean {
  return !RESPONSIVE_GRID_STYLE_PROPERTIES.has(property);
}

function breakpointLabel(
  labels: StyleRulesEditorLabels,
  breakpoint: ResponsiveGridBreakpoint,
): string {
  const key = BREAKPOINT_SHORT_LABEL_KEYS[breakpoint];
  const labeled = labels[key];
  return typeof labeled === "string"
    ? labeled
    : BREAKPOINT_FALLBACK_LABELS[breakpoint];
}

function setBreakpointValue(
  rule: StyleRule,
  breakpoint: ResponsiveGridBreakpoint,
  nextValue: StyleRuleValue | undefined,
): StyleRule["valuesByBreakpoint"] {
  const current = { ...(rule.valuesByBreakpoint ?? {}) };
  if (nextValue === undefined) {
    delete current[breakpoint];
  } else {
    current[breakpoint] = nextValue;
  }
  return Object.keys(current).length > 0 ? current : undefined;
}

function configuredBreakpoints(
  rule: StyleRule,
): readonly ResponsiveGridBreakpoint[] {
  return RESPONSIVE_BREAKPOINT_ORDER.filter(
    (bp) => rule.valuesByBreakpoint?.[bp] !== undefined,
  );
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

type BreakpointDraft = {
  readonly mode: "add" | "edit";
  readonly breakpoint: ResponsiveGridBreakpoint;
  readonly value: StyleRuleValue;
  /** Original breakpoint when editing (for renames / stable remove). */
  readonly originalBreakpoint: ResponsiveGridBreakpoint | null;
};

export interface StyleRuleEditorFieldsProps {
  readonly rule: StyleRule;
  readonly labels: StyleRulesEditorLabels;
  readonly onChange: (patch: Partial<StyleRule>) => void;
  /** Fired when entering/leaving the nested screen-override editor. */
  readonly onSubViewChange?: (active: boolean) => void;
}

export function StyleRuleEditorFields({
  rule,
  labels,
  onChange,
  onSubViewChange,
}: StyleRuleEditorFieldsProps) {
  const showBreakpoints = supportsResponsiveValues(rule.property);
  const defaultLabel = labels.styleDefaultValue ?? labels.styleValue;
  const breakpointsLabel = labels.styleBreakpoints ?? "Screen overrides";
  const addBreakpointLabel =
    labels.styleAddBreakpoint ?? "Add screen override";
  const editBreakpointLabel =
    labels.styleEditBreakpoint ?? "Edit screen override";
  const screenLabel = labels.styleBreakpointScreen ?? "Screen";
  const emptyLabel =
    labels.styleBreakpointEmpty ?? "No screen-specific overrides";
  const saveOverrideLabel =
    labels.styleSaveBreakpoint ?? labels.saveStyleRule ?? "Save override";
  const backLabel = labels.styleBreakpointBack ?? "Back";
  const removeLabel = labels.removeStyleRule;

  const [draft, setDraft] = useState<BreakpointDraft | null>(null);

  const setDraftAndNotify = (next: BreakpointDraft | null) => {
    setDraft(next);
    onSubViewChange?.(next !== null);
  };

  const configured = useMemo(() => configuredBreakpoints(rule), [rule]);
  const availableForAdd = useMemo(
    () =>
      RESPONSIVE_BREAKPOINT_ORDER.filter(
        (bp) =>
          rule.valuesByBreakpoint?.[bp] === undefined ||
          (draft?.mode === "edit" && draft.originalBreakpoint === bp),
      ),
    [rule.valuesByBreakpoint, draft],
  );

  const openAddDraft = () => {
    const first = RESPONSIVE_BREAKPOINT_ORDER.find(
      (bp) => rule.valuesByBreakpoint?.[bp] === undefined,
    );
    if (!first) {
      return;
    }
    setDraftAndNotify({
      mode: "add",
      breakpoint: first,
      value: defaultValueForProperty(rule.property),
      originalBreakpoint: null,
    });
  };

  const openEditDraft = (breakpoint: ResponsiveGridBreakpoint) => {
    const existing = rule.valuesByBreakpoint?.[breakpoint];
    if (existing === undefined) {
      return;
    }
    setDraftAndNotify({
      mode: "edit",
      breakpoint,
      value: existing,
      originalBreakpoint: breakpoint,
    });
  };

  const confirmDraft = () => {
    if (!draft) {
      return;
    }

    const nextMap = { ...(rule.valuesByBreakpoint ?? {}) };
    if (
      draft.mode === "edit" &&
      draft.originalBreakpoint &&
      draft.originalBreakpoint !== draft.breakpoint
    ) {
      delete nextMap[draft.originalBreakpoint];
    }
    nextMap[draft.breakpoint] = draft.value;
    onChange({
      valuesByBreakpoint:
        Object.keys(nextMap).length > 0 ? nextMap : undefined,
    });
    setDraftAndNotify(null);
  };

  if (draft) {
    const selectableScreens =
      draft.mode === "add"
        ? availableForAdd
        : RESPONSIVE_BREAKPOINT_ORDER.filter(
            (bp) =>
              bp === draft.originalBreakpoint ||
              rule.valuesByBreakpoint?.[bp] === undefined,
          );

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground -ml-2 w-fit px-2"
            onClick={() => setDraftAndNotify(null)}
          >
            ← {backLabel}
          </Button>
          <p className="text-base font-semibold">
            {draft.mode === "add" ? addBreakpointLabel : editBreakpointLabel}
          </p>
          <p className="text-muted-foreground text-sm">
            {labels.styleBreakpointsHint ??
              "Applies from mobile through the selected screen size."}
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">{screenLabel}</span>
          <Select
            value={draft.breakpoint}
            onChange={(event) =>
              setDraft({
                ...draft,
                breakpoint: event.target.value as ResponsiveGridBreakpoint,
              })
            }
          >
            {selectableScreens.map((bp) => (
              <option key={bp} value={bp}>
                {breakpointLabel(labels, bp)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">{labels.styleValue}</span>
          <StyleRuleValueInput
            rule={rule}
            value={draft.value}
            labels={labels}
            onChangeValue={(value) =>
              setDraft({
                ...draft,
                value: value ?? defaultValueForProperty(rule.property),
              })
            }
          />
        </label>
        <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDraftAndNotify(null)}
          >
            {backLabel}
          </Button>
          <Button type="button" size="sm" onClick={confirmDraft}>
            {saveOverrideLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">{labels.styleProperty}</span>
        <Select
          searchable
          value={rule.property}
          onChange={(event) => {
            const property = event.target.value as StylePropertyKey;
            if (property === rule.property) {
              return;
            }
            onChange({
              property,
              value: defaultValueForProperty(property),
              valuesByBreakpoint: undefined,
            });
          }}
        >
          {STYLE_PROPERTY_OPTIONS.filter(
            (property) => !RESPONSIVE_GRID_STYLE_PROPERTIES.has(property),
          ).map((property) => (
            <option key={property} value={property}>
              {formatPropertyLabel(property)}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">{defaultLabel}</span>
        <StyleRuleValueInput
          rule={rule}
          value={rule.value}
          labels={labels}
          onChangeValue={(value) => onChange({ value })}
        />
      </label>
      {showBreakpoints ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-sm">
              {breakpointsLabel}
            </span>
            {availableForAdd.length > 0 ? (
              <IconButton
                type="button"
                label={addBreakpointLabel}
                size="sm"
                onClick={openAddDraft}
              >
                <PlusIcon />
              </IconButton>
            ) : null}
          </div>
          <div className="border-border/70 overflow-hidden rounded-lg border">
            {configured.length === 0 ? (
              <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                {emptyLabel}
              </p>
            ) : (
              <ul className="divide-border/60 divide-y">
                {configured.map((breakpoint) => {
                  const bpValue = rule.valuesByBreakpoint?.[breakpoint];
                  return (
                    <li
                      key={breakpoint}
                      className="hover:bg-muted/20 flex items-center gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {breakpointLabel(labels, breakpoint)}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatStyleRuleValuePreview({
                            property: rule.property,
                            value: bpValue,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <IconButton
                          type="button"
                          label={editBreakpointLabel}
                          size="sm"
                          onClick={() => openEditDraft(breakpoint)}
                        >
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          type="button"
                          label={removeLabel}
                          size="sm"
                          onClick={() =>
                            onChange({
                              valuesByBreakpoint: setBreakpointValue(
                                rule,
                                breakpoint,
                                undefined,
                              ),
                            })
                          }
                        >
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {configured.length === 0 && availableForAdd.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={openAddDraft}
            >
              {addBreakpointLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function formatStylePropertyLabel(property: StylePropertyKey): string {
  return formatPropertyLabel(property);
}
