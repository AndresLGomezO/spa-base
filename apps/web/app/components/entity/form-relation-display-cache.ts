import type { SerializableEntityDefinition } from "@repo/entities";

export const FORM_DISPLAY_CACHE_KEY = "_populated" as const;

type PopulatedCache = Record<string, Record<string, unknown> | null>;

function readPopulatedCache(values: Record<string, unknown>): PopulatedCache {
  const populated = values[FORM_DISPLAY_CACHE_KEY];
  if (!populated || typeof populated !== "object" || Array.isArray(populated)) {
    return {};
  }
  return populated as PopulatedCache;
}

export function applyRelationDisplayCache(
  values: Record<string, unknown>,
  fieldName: string,
  displayRecord: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (displayRecord == null) {
    const nextPopulated = { ...readPopulatedCache(values) };
    delete nextPopulated[fieldName];
    if (Object.keys(nextPopulated).length === 0) {
      const rest = { ...values };
      delete rest[FORM_DISPLAY_CACHE_KEY];
      return rest;
    }
    return { ...values, [FORM_DISPLAY_CACHE_KEY]: nextPopulated };
  }

  return {
    ...values,
    [FORM_DISPLAY_CACHE_KEY]: {
      ...readPopulatedCache(values),
      [fieldName]: displayRecord,
    },
  };
}

export function applyFormFieldChange(
  definition: SerializableEntityDefinition,
  values: Record<string, unknown>,
  fieldName: string,
  value: unknown,
  displayRecord?: Record<string, unknown> | null,
): Record<string, unknown> {
  const nextValues = { ...values, [fieldName]: value };
  const meta = definition.fields[fieldName];
  if (!meta) {
    return nextValues;
  }

  const isRelationFk =
    meta.relation?.type === "many-to-one" ||
    meta.relation?.type === "one-to-one";

  if (isRelationFk || meta.type === "enum") {
    if (displayRecord !== undefined) {
      return applyRelationDisplayCache(nextValues, fieldName, displayRecord);
    }
    if (value === null || value === undefined || value === "") {
      return applyRelationDisplayCache(nextValues, fieldName, null);
    }
  }

  return nextValues;
}

export function isFormDisplayCacheKey(fieldName: string): boolean {
  return fieldName === FORM_DISPLAY_CACHE_KEY;
}
