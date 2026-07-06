import type { SerializableFieldMeta } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog.js";
import { formatFieldLabel } from "../../entities/entity-catalog.js";

export type EntityFieldConditionOperator = "==" | "in";

interface EntityFieldOption {
  readonly value: string;
  readonly label: string;
}

export interface EntityFieldConditionFieldMeta {
  readonly type: string;
  readonly enumValues?: readonly string[];
}

function parseCommaSeparatedList(value: string): readonly string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function asStringArray(value: string | readonly string[]): readonly string[] {
  if (typeof value === "string") {
    return parseCommaSeparatedList(value);
  }
  return value;
}

function asString(value: string | readonly string[]): string {
  if (typeof value === "string") {
    return value;
  }
  return value[0] ?? "";
}

export function listDirectEntityFieldOptions(
  entity: EntityCatalogEntry | undefined,
): readonly EntityFieldOption[] {
  if (!entity) {
    return [];
  }

  return Object.entries(entity.fields)
    .filter(([, meta]) => meta.type !== "document")
    .map(([name]) => ({
      value: name,
      label: formatFieldLabel(name, entity),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function resolveEntityFieldMeta(
  entity: EntityCatalogEntry | undefined,
  fieldPath: string,
): SerializableFieldMeta | undefined {
  const normalized = fieldPath.trim();
  if (!entity || normalized.length === 0) {
    return undefined;
  }

  return entity.fields[normalized];
}

export function normalizeConditionValue(
  fieldMeta: EntityFieldConditionFieldMeta | undefined,
  operator: EntityFieldConditionOperator,
  current: string | readonly string[],
): string | readonly string[] {
  const fieldType = fieldMeta?.type ?? "string";

  if (operator === "in") {
    let values = [...asStringArray(current)];

    if (fieldType === "enum" && fieldMeta?.enumValues) {
      values = values.filter((entry) => fieldMeta.enumValues!.includes(entry));
      if (values.length === 0 && fieldMeta.enumValues.length > 0) {
        return [fieldMeta.enumValues[0]!];
      }
      return values;
    }

    if (fieldType === "boolean") {
      values = values.filter((entry) => entry === "true" || entry === "false");
      return values;
    }

    return values;
  }

  const scalar = asString(current);

  if (fieldType === "enum" && fieldMeta?.enumValues) {
    if (!fieldMeta.enumValues.includes(scalar)) {
      return fieldMeta.enumValues[0] ?? "";
    }
    return scalar;
  }

  if (fieldType === "boolean") {
    if (scalar !== "true" && scalar !== "false") {
      return "";
    }
    return scalar;
  }

  return scalar;
}

export function createDefaultConditionField(
  entity: EntityCatalogEntry | undefined,
): string {
  if (entity?.fields.type) {
    return "type";
  }

  return listDirectEntityFieldOptions(entity)[0]?.value ?? "";
}

export function createDefaultConditionValue(
  entity: EntityCatalogEntry | undefined,
  fieldPath: string,
  operator: EntityFieldConditionOperator,
): string | readonly string[] {
  const fieldMeta = resolveEntityFieldMeta(entity, fieldPath);
  return normalizeConditionValue(fieldMeta, operator, "");
}
