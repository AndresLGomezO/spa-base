import type { FieldDefinitionInput } from "../../lib/api-client";

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
    required: false,
    ui: { order, filterable: true, sortable: true },
    ...(type === "enum" ? { enumValues: [""] } : {}),
    ...(type === "relation"
      ? { relation: { target: "", type: "many-to-one" } }
      : {}),
  };
}
