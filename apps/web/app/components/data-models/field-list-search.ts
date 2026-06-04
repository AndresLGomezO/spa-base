import type { FieldDefinitionInput } from "../../lib/api-client";

export function fieldSupportsListSearch(
  field: Pick<FieldDefinitionInput, "type" | "sensitive">,
): boolean {
  return field.type === "string" && field.sensitive !== true;
}

export function isFieldSearchableChecked(field: FieldDefinitionInput): boolean {
  if (!fieldSupportsListSearch(field)) {
    return false;
  }

  return field.ui?.searchable !== false;
}
