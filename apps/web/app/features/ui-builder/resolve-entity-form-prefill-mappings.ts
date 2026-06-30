import type {
  EntityFormPrefillMapping,
  EntityFormPrefillSource,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { FieldDateDisplayFormat } from "@repo/entities";

export function isCreateFormPrefillTargetFieldEligible(
  fieldName: string,
  definition: SerializableEntityDefinition,
): boolean {
  if (fieldName.includes(".")) {
    return false;
  }

  const meta = definition.fields[fieldName];
  if (!meta) {
    return false;
  }

  if (
    meta.type === "string" ||
    meta.type === "number" ||
    meta.type === "boolean" ||
    meta.type === "enum" ||
    meta.type === "date"
  ) {
    return true;
  }

  if (meta.type === "relation" && meta.relation) {
    return (
      meta.relation.type === "many-to-one" ||
      meta.relation.type === "one-to-one"
    );
  }

  return false;
}

function readTargetDateDisplayFormat(
  definition: SerializableEntityDefinition,
  fieldName: string,
): FieldDateDisplayFormat {
  return definition.ui.fields?.[fieldName]?.dateDisplayFormat ?? "datetime";
}

function formatCurrentDateValue(
  definition: SerializableEntityDefinition,
  fieldName: string,
): string {
  const now = new Date();
  const mode = readTargetDateDisplayFormat(definition, fieldName);

  if (mode === "date") {
    return now.toISOString().slice(0, 10);
  }

  if (mode === "time") {
    return now.toISOString().slice(11, 16);
  }

  return now.toISOString();
}

function coercePrefillValue(raw: unknown): string | undefined {
  if (raw == null) {
    return undefined;
  }

  if (typeof raw === "boolean") {
    return raw ? "true" : "false";
  }

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? String(raw) : undefined;
  }

  const value = String(raw).trim();
  return value.length > 0 ? value : undefined;
}

function resolvePrefillSourceValue(
  source: EntityFormPrefillSource,
  targetField: string,
  targetDefinition: SerializableEntityDefinition,
  resolveField: (path: string) => unknown,
): string | undefined {
  if (source.type === "currentDate") {
    const meta = targetDefinition.fields[targetField];
    if (meta?.type !== "date") {
      return undefined;
    }

    return formatCurrentDateValue(targetDefinition, targetField);
  }

  if (source.type === "enumValue") {
    const meta = targetDefinition.fields[targetField];
    if (meta?.type !== "enum") {
      return undefined;
    }

    const value = source.value.trim();
    if (!value) {
      return undefined;
    }

    const enumValues = meta.enumValues ?? [];
    return enumValues.includes(value) ? value : undefined;
  }

  return coercePrefillValue(resolveField(source.path));
}

export function resolveEntityFormPrefillMappings(
  mappings: readonly EntityFormPrefillMapping[],
  targetDefinition: SerializableEntityDefinition,
  resolveField: (path: string) => unknown,
): Record<string, string> {
  const prefill: Record<string, string> = {};

  for (const mapping of mappings) {
    const targetField = mapping.targetField.trim();
    if (
      !targetField ||
      !isCreateFormPrefillTargetFieldEligible(targetField, targetDefinition)
    ) {
      continue;
    }

    const value = resolvePrefillSourceValue(
      mapping.source,
      targetField,
      targetDefinition,
      resolveField,
    );
    if (value) {
      prefill[targetField] = value;
    }
  }

  return prefill;
}

export function listCreateFormPrefillTargetFields(
  definition: SerializableEntityDefinition,
): readonly string[] {
  return Object.keys(definition.fields)
    .filter((fieldName) =>
      isCreateFormPrefillTargetFieldEligible(fieldName, definition),
    )
    .sort((a, b) => a.localeCompare(b));
}
