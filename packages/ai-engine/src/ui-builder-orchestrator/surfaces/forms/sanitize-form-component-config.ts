import {
  createDefaultComponent,
  styleRuleSchema,
  type UiComponentConfig,
  type UiComponentKind,
} from "@repo/ui-builder-core";

const DISPLAY_FIELD_KINDS = new Set([
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
]);

const STRUCTURAL_KINDS = new Set([
  "form-actions",
  "wizard-progress",
  "wizard-step-host",
  "wizard-actions",
  "entity-field-selector",
]);

const LABEL_COLORS = new Set([
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFieldPath(value: Record<string, unknown>): string | undefined {
  if (
    typeof value.fieldPath === "string" &&
    value.fieldPath.trim().length > 0
  ) {
    return value.fieldPath.trim();
  }

  const primary = value.primary;
  if (isRecord(primary) && typeof primary.path === "string") {
    const path = primary.path.trim();
    return path.length > 0 ? path : undefined;
  }

  return undefined;
}

function normalizeLabel(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value) || typeof value.show !== "boolean") {
    return undefined;
  }

  const label: Record<string, unknown> = { show: value.show };
  if (typeof value.text === "string" && value.text.trim().length > 0) {
    label.text = value.text.trim();
  }
  if (value.position === "above" || value.position === "below") {
    label.position = value.position;
  }
  if (typeof value.bold === "boolean") {
    label.bold = value.bold;
  }
  if (typeof value.color === "string" && LABEL_COLORS.has(value.color.trim())) {
    label.color = value.color.trim();
  }
  if (
    value.align === "left" ||
    value.align === "center" ||
    value.align === "right"
  ) {
    label.align = value.align;
  }

  return label;
}

function sanitizeStyles(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const styles = raw
    .map((item) => styleRuleSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);

  return styles.length > 0 ? styles : undefined;
}

function sanitizeConditionalStyles(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const rules: Record<string, unknown>[] = [];

  for (const item of raw) {
    if (!isRecord(item) || typeof item.matchValue !== "string") {
      continue;
    }

    const rule: Record<string, unknown> = {
      matchValue: item.matchValue,
    };

    if (
      typeof item.background === "string" &&
      item.background.trim().length > 0
    ) {
      rule.background = item.background.trim();
    }

    if (
      typeof item.textColor === "string" &&
      item.textColor.trim().length > 0
    ) {
      rule.textColor = item.textColor.trim();
    }

    rules.push(rule);
  }

  return rules.length > 0 ? rules : undefined;
}

function withStylesOnly<T extends Record<string, unknown>>(
  base: T,
  record: Record<string, unknown> | null,
): T {
  const styles = sanitizeStyles(record?.styles);
  return styles ? { ...base, styles } : base;
}

function withVisualProps<T extends Record<string, unknown>>(
  base: T,
  record: Record<string, unknown> | null,
): T {
  const styles = sanitizeStyles(record?.styles);
  const conditionalStyles = sanitizeConditionalStyles(
    record?.conditionalStyles,
  );

  return {
    ...base,
    ...(styles ? { styles } : {}),
    ...(conditionalStyles ? { conditionalStyles } : {}),
  };
}

function normalizeWizardStepLabel(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const label: Record<string, unknown> = {};
  if (typeof value.show === "boolean") {
    label.show = value.show;
  }
  if (value.position === "top" || value.position === "bottom") {
    label.position = value.position;
  }
  if (typeof value.bold === "boolean") {
    label.bold = value.bold;
  }
  if (typeof value.thin === "boolean") {
    label.thin = value.thin;
  }
  if (typeof value.color === "string" && value.color.trim().length > 0) {
    label.color = value.color.trim();
  }
  if (
    value.align === "left" ||
    value.align === "center" ||
    value.align === "right"
  ) {
    label.align = value.align;
  }
  if (typeof value.fontSize === "number" && Number.isFinite(value.fontSize)) {
    label.fontSize = value.fontSize;
  }

  return Object.keys(label).length > 0 ? label : undefined;
}

export function sanitizeFormComponentConfig(
  kind: string,
  fieldPath: string,
  raw: unknown,
): UiComponentConfig {
  const fallbackPath = fieldPath.trim().length > 0 ? fieldPath.trim() : "name";

  if (kind === "form-field") {
    const record = isRecord(raw) && raw.kind === "form-field" ? raw : null;
    const path =
      typeof record?.fieldPath === "string" &&
      record.fieldPath.trim().length > 0
        ? record.fieldPath.trim()
        : fallbackPath;
    return withStylesOnly(
      {
        kind: "form-field" as const,
        fieldPath: path,
        ...(record?.hideLabel === true ? { hideLabel: true } : {}),
      },
      record,
    ) as UiComponentConfig;
  }

  if (kind === "form-section") {
    const record = isRecord(raw) && raw.kind === "form-section" ? raw : null;
    const title =
      typeof record?.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : "Section";
    return withStylesOnly(
      { kind: "form-section", title },
      record,
    ) as UiComponentConfig;
  }

  if (kind === "wizard-progress") {
    const record = isRecord(raw) && raw.kind === "wizard-progress" ? raw : null;
    const defaults = createDefaultComponent("wizard-progress");
    const defaultRecord = defaults as unknown as Record<string, unknown>;
    return withVisualProps(
      {
        kind: "wizard-progress" as const,
        variant:
          record?.variant === "steps" ||
          record?.variant === "stepper" ||
          record?.variant === "bar"
            ? record.variant
            : ((defaultRecord.variant as
                | "steps"
                | "bar"
                | "stepper"
                | undefined) ?? "steps"),
        ...(normalizeWizardStepLabel(record?.stepLabel)
          ? { stepLabel: normalizeWizardStepLabel(record?.stepLabel) }
          : defaultRecord.stepLabel
            ? { stepLabel: defaultRecord.stepLabel }
            : {}),
        ...(typeof record?.barTrackColor === "string"
          ? { barTrackColor: record.barTrackColor.trim() }
          : {}),
        ...(typeof record?.barFillColor === "string"
          ? { barFillColor: record.barFillColor.trim() }
          : {}),
        ...(typeof record?.stepSpacing === "number"
          ? { stepSpacing: record.stepSpacing }
          : {}),
        ...(typeof record?.circleSize === "number"
          ? { circleSize: record.circleSize }
          : {}),
        ...(typeof record?.labelMaxWidth === "number"
          ? { labelMaxWidth: record.labelMaxWidth }
          : {}),
      },
      record,
    ) as UiComponentConfig;
  }

  if (kind === "wizard-step-host" || kind === "wizard-actions") {
    const record = isRecord(raw) && raw.kind === kind ? raw : null;
    return withStylesOnly(
      { kind: kind as "wizard-step-host" | "wizard-actions" },
      record,
    ) as UiComponentConfig;
  }

  if (kind === "entity-field-selector") {
    const record =
      isRecord(raw) && raw.kind === "entity-field-selector" ? raw : null;
    const path = (record ? readFieldPath(record) : undefined) ?? fallbackPath;
    return withStylesOnly(
      {
        kind: "entity-field-selector" as const,
        fieldPath: path,
        layout: "list" as const,
        enableSearch: true,
      },
      record,
    ) as UiComponentConfig;
  }

  if (STRUCTURAL_KINDS.has(kind)) {
    return createDefaultComponent(kind as "form-actions");
  }

  if (DISPLAY_FIELD_KINDS.has(kind)) {
    const componentKind = kind as UiComponentKind;
    const record = isRecord(raw) && raw.kind === kind ? raw : null;
    const primary = record?.primary;

    if (
      isRecord(primary) &&
      primary.type === "static" &&
      typeof primary.value === "string" &&
      primary.value.trim().length > 0
    ) {
      return withVisualProps(
        {
          kind: componentKind,
          primary: { type: "static" as const, value: primary.value.trim() },
        },
        record,
      ) as UiComponentConfig;
    }

    const path = (record ? readFieldPath(record) : undefined) ?? fallbackPath;
    const defaults = createDefaultComponent(componentKind, path);
    return withVisualProps(
      {
        kind: componentKind,
        primary: { type: "field" as const, path },
        ...(normalizeLabel(record?.label)
          ? { label: normalizeLabel(record?.label) }
          : "label" in defaults && defaults.label
            ? { label: defaults.label }
            : {}),
      },
      record,
    ) as unknown as UiComponentConfig;
  }

  return createDefaultComponent("form-field", fallbackPath);
}
