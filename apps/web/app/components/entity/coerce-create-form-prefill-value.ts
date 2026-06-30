import type { SerializableFieldMeta } from "@repo/entities";

export function coerceCreateFormPrefillValue(
  meta: SerializableFieldMeta,
  raw: string,
): unknown | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (meta.type === "number") {
    if (meta.numberKind === "integer") {
      if (!/^-?\d+$/.test(trimmed)) {
        return undefined;
      }

      return Number.parseInt(trimmed, 10);
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (meta.type === "boolean") {
    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }

    return undefined;
  }

  if (meta.type === "enum") {
    const enumValues = meta.enumValues ?? [];
    return enumValues.includes(trimmed) ? trimmed : undefined;
  }

  return trimmed;
}

import type { SerializableEntityDefinition } from "@repo/entities";

export function applyCreateFormPrefill(
  definition: SerializableEntityDefinition,
  initial: Record<string, unknown>,
  createPrefill: Readonly<Record<string, string>>,
): void {
  for (const [fieldName, value] of Object.entries(createPrefill)) {
    const meta = definition.fields[fieldName];
    if (!meta) {
      continue;
    }

    const coerced = coerceCreateFormPrefillValue(meta, value);
    if (coerced !== undefined) {
      initial[fieldName] = coerced;
    }
  }
}
