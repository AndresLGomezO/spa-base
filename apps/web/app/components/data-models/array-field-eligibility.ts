import { isArrayEligibleFieldType } from "@repo/entities";

import type { FieldDefinitionInput } from "../../lib/api-client";

export function fieldSupportsArray(
  type: FieldDefinitionInput["type"],
): boolean {
  return isArrayEligibleFieldType(type);
}

export function formatFieldTypeLabel(
  field: Pick<FieldDefinitionInput, "type" | "isArray">,
  translateType: (type: FieldDefinitionInput["type"]) => string,
): string {
  const base = translateType(field.type);
  return field.isArray ? `${base}[]` : base;
}
