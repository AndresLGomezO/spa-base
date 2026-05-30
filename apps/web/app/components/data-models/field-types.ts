import type { FieldDefinitionInput } from "../../lib/api-client";

import { generateRelationFieldName } from "./generate-relation-field-name";

export const FIELD_TYPES: readonly FieldDefinitionInput["type"][] = [
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "relation",
];

export function createEmptyField(
  type: FieldDefinitionInput["type"] = "string",
  order = 0,
): FieldDefinitionInput {
  return {
    name: "",
    type,
    required: true,
    ui: { order, filterable: true, sortable: true },
    ...(type === "enum" ? { enumValues: [""] } : {}),
    ...(type === "relation"
      ? { relation: { target: "", type: "many-to-one" } }
      : {}),
  };
}

export function resolveFieldDefinitionName(
  field: FieldDefinitionInput,
): string {
  if (field.type === "relation" && field.relation?.target) {
    const relationType = field.relation.type ?? "many-to-one";
    const generated = generateRelationFieldName(
      field.relation.target,
      relationType,
    );
    if (!field.name.trim()) {
      return generated;
    }
  }

  return field.name.trim();
}
