import { FORM_DISPLAY_CACHE_KEY } from "./form-relation-display-cache";

function readSourcePopulated(
  item: Record<string, unknown>,
): Record<string, Record<string, unknown> | null> {
  const populated = item[FORM_DISPLAY_CACHE_KEY];
  if (!populated || typeof populated !== "object" || Array.isArray(populated)) {
    return {};
  }
  return populated as Record<string, Record<string, unknown> | null>;
}

export function buildCreatePrefillPopulated(
  createPrefill: Readonly<Record<string, string>> | undefined,
  sourceItem: Record<string, unknown>,
): Readonly<Record<string, Record<string, unknown> | null>> | undefined {
  if (!createPrefill) {
    return undefined;
  }

  const sourcePopulated = readSourcePopulated(sourceItem);
  const populated: Record<string, Record<string, unknown> | null> = {};

  for (const [fieldName, prefilledValue] of Object.entries(createPrefill)) {
    const cached = sourcePopulated[fieldName];
    if (cached) {
      populated[fieldName] = cached;
      continue;
    }

    if (prefilledValue === String(sourceItem.id ?? "")) {
      populated[fieldName] = sourceItem;
    }
  }

  return Object.keys(populated).length > 0 ? populated : undefined;
}
