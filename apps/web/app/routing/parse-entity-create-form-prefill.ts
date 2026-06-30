import type { SerializableEntityDefinition } from "@repo/entities";

const RESERVED_CREATE_PREFILL_PARAMS = new Set([
  "create",
  "edit",
  "q",
  "page",
  "sort",
  "sortDir",
]);

function isDataViewFilterParam(key: string): boolean {
  return key.startsWith("f.");
}

export function parseEntityCreateFormPrefill(
  searchParams: URLSearchParams,
  definition: SerializableEntityDefinition,
): Record<string, string> {
  const prefill: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    if (RESERVED_CREATE_PREFILL_PARAMS.has(key) || isDataViewFilterParam(key)) {
      continue;
    }

    if (!(key in definition.fields)) {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      prefill[key] = trimmed;
    }
  }

  return prefill;
}

export function stripEntityFormModalSearchParams(
  searchParams: URLSearchParams,
  definition: SerializableEntityDefinition,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  next.delete("create");
  next.delete("edit");

  for (const fieldName of Object.keys(definition.fields)) {
    next.delete(fieldName);
  }

  return next;
}
