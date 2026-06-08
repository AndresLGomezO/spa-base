import type { FieldDefinitionInput } from "../../lib/api-client";

export function fieldSupportsListSearch(
  field: Pick<FieldDefinitionInput, "type" | "sensitive" | "isArray">,
): boolean {
  if (field.sensitive === true) {
    return false;
  }

  if (field.isArray === true) {
    return field.type === "string" || field.type === "enum";
  }

  return field.type === "string";
}

export function isFieldSearchableChecked(field: FieldDefinitionInput): boolean {
  if (!fieldSupportsListSearch(field)) {
    return false;
  }

  return field.ui?.searchable !== false;
}
