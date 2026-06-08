import { formatDisplayValue, type DisplayFieldType } from "@repo/ui";
import type { FieldUIConfig, SerializableFieldMeta } from "@repo/entities";

export function coerceArrayValue(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...value];
}

function itemsEqual(
  left: unknown,
  right: unknown,
  fieldType: SerializableFieldMeta["type"],
): boolean {
  if (fieldType === "string" || fieldType === "enum" || fieldType === "date") {
    return (
      typeof left === "string" &&
      typeof right === "string" &&
      left.trim() === right.trim()
    );
  }
  return Object.is(left, right);
}

export function appendArrayItem(
  items: readonly unknown[],
  item: unknown,
  options: {
    readonly dedupe?: boolean;
    readonly fieldType: SerializableFieldMeta["type"];
  },
): unknown[] {
  if (
    options.dedupe &&
    items.some((existing) => itemsEqual(existing, item, options.fieldType))
  ) {
    return [...items];
  }
  return [...items, item];
}

export function removeArrayItemAt(
  items: readonly unknown[],
  index: number,
): unknown[] {
  if (index < 0 || index >= items.length) {
    return [...items];
  }
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function parseDraftString(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseDraftNumber(
  raw: string,
  options: { readonly integer?: boolean } = {},
): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (options.integer) {
    if (!/^-?\d+$/.test(trimmed)) {
      return undefined;
    }
    return Number.parseInt(trimmed, 10);
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseDraftBoolean(raw: string): boolean | undefined {
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return undefined;
}

export function formatArrayItemForDisplay(
  item: unknown,
  meta: SerializableFieldMeta,
  locale: string,
  fieldUI?: FieldUIConfig,
): string {
  return formatDisplayValue(item, {
    locale,
    fieldType: meta.type as DisplayFieldType,
    displayFormat: fieldUI?.displayFormat,
    dateDisplayFormat: fieldUI?.dateDisplayFormat,
  });
}
