import type { DefinedEntity, FieldDefinitions } from "../types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function normalizeStringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return normalized.length > 0 ? normalized : [];
}

export function normalizeArrayFieldValues(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...record };

  for (const [fieldName, meta] of Object.entries(entity.metadata.fields)) {
    if (meta.isArray !== true) {
      continue;
    }
    if (meta.type !== "string" && meta.type !== "enum") {
      continue;
    }
    if (!(fieldName in next)) {
      continue;
    }

    const normalized = normalizeStringArrayValue(next[fieldName]);
    if (normalized === undefined) {
      continue;
    }

    if (normalized.length === 0) {
      Reflect.deleteProperty(next, fieldName);
    } else {
      next[fieldName] = normalized;
    }
  }

  return next;
}
