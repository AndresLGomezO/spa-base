import {
  createDefaultComponent,
  styleRuleSchema,
  type UiComponentConfig,
  type UiComponentKind,
} from "@repo/ui-builder-core";

const LIST_DISPLAY_FIELD_KINDS = new Set([
  "text",
  "image",
  "date",
  "numeric",
  "badge",
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

const BADGE_VARIANTS = new Set([
  "success",
  "warning",
  "danger",
  "info",
  "default",
  "active",
  "pending",
  "closed",
  "neutral",
]);

const BADGE_VARIANT_ALIASES: Record<string, string> = {
  primary: "default",
};

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
  if (typeof value.thin === "boolean") {
    label.thin = value.thin;
  }
  if (typeof value.italic === "boolean") {
    label.italic = value.italic;
  }
  if (typeof value.underline === "boolean") {
    label.underline = value.underline;
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

    if (typeof item.badgeVariant === "string") {
      const normalized =
        BADGE_VARIANT_ALIASES[item.badgeVariant] ?? item.badgeVariant;
      if (BADGE_VARIANTS.has(normalized)) {
        rule.badgeVariant = normalized;
      }
    }

    rules.push(rule);
  }

  return rules.length > 0 ? rules : undefined;
}

function sanitizeFallbacks(raw: unknown): unknown[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const fallbacks: Array<
    { type: "field"; path: string } | { type: "static"; value: string }
  > = [];

  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      item.type === "field" &&
      typeof item.path === "string" &&
      item.path.trim().length > 0
    ) {
      fallbacks.push({ type: "field", path: item.path.trim() });
      continue;
    }

    if (item.type === "static" && typeof item.value === "string") {
      fallbacks.push({ type: "static", value: item.value });
    }
  }

  return fallbacks.length > 0 ? fallbacks : undefined;
}

function withVisualProps<T extends Record<string, unknown>>(
  base: T,
  record: Record<string, unknown> | null,
): T {
  const styles = sanitizeStyles(record?.styles);
  const conditionalStyles = sanitizeConditionalStyles(
    record?.conditionalStyles,
  );
  const fallbacks = sanitizeFallbacks(record?.fallbacks);

  return {
    ...base,
    ...(styles ? { styles } : {}),
    ...(conditionalStyles ? { conditionalStyles } : {}),
    ...(fallbacks ? { fallbacks } : {}),
  };
}

function clampImageSize(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(96, Math.max(8, Math.round(value)));
}

export function sanitizeListComponentConfig(
  kind: string,
  fieldPath: string,
  raw: unknown,
): UiComponentConfig {
  const fallbackPath = fieldPath.trim().length > 0 ? fieldPath.trim() : "name";

  if (kind === "metric-kpi" || kind === "metric-widget") {
    return createDefaultComponent("text", fallbackPath);
  }

  if (kind === "icon") {
    const record = isRecord(raw) && raw.kind === "icon" ? raw : null;
    return withVisualProps(
      {
        kind: "icon" as const,
        iconName:
          typeof record?.iconName === "string" &&
          record.iconName.trim().length > 0
            ? record.iconName.trim()
            : "CircleCheck",
        ...(typeof record?.iconSize === "number"
          ? { iconSize: record.iconSize }
          : {}),
        ...(normalizeLabel(record?.label)
          ? { label: normalizeLabel(record?.label) }
          : {}),
      },
      record,
    ) as unknown as UiComponentConfig;
  }

  if (!LIST_DISPLAY_FIELD_KINDS.has(kind)) {
    return createDefaultComponent("text", fallbackPath);
  }

  const componentKind = kind as UiComponentKind;
  const defaults = createDefaultComponent(componentKind, fallbackPath);
  const record = isRecord(raw) && raw.kind === kind ? raw : null;
  const path = (record ? readFieldPath(record) : undefined) ?? fallbackPath;

  const base = withVisualProps(
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
  );

  if (componentKind === "numeric" && record) {
    return {
      ...base,
      ...(record.displayFormat === "currency" ||
      record.displayFormat === "plain" ||
      record.displayFormat === "percentage"
        ? { displayFormat: record.displayFormat }
        : {}),
      ...(typeof record.showCurrency === "boolean"
        ? { showCurrency: record.showCurrency }
        : {}),
      ...(typeof record.showToneColors === "boolean"
        ? { showToneColors: record.showToneColors }
        : {}),
    } as UiComponentConfig;
  }

  if (componentKind === "date" && record) {
    return {
      ...base,
      ...(record.dateDisplayFormat === "date" ||
      record.dateDisplayFormat === "datetime" ||
      record.dateDisplayFormat === "time"
        ? { dateDisplayFormat: record.dateDisplayFormat }
        : {}),
    } as UiComponentConfig;
  }

  if (componentKind === "image" && record) {
    return {
      ...base,
      ...(clampImageSize(record.imageSize)
        ? { imageSize: clampImageSize(record.imageSize) }
        : {}),
    } as unknown as UiComponentConfig;
  }

  return base as unknown as UiComponentConfig;
}
