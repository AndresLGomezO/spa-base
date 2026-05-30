import type { FieldDefinitionInput } from "../../lib/api-client";

export type RelationType = NonNullable<
  FieldDefinitionInput["relation"]
>["type"];

export function generateRelationFieldName(
  target: string,
  type: RelationType,
): string {
  if (!target) {
    return "";
  }
  if (type === "many-to-one" || type === "one-to-one") {
    return `${target}Id`;
  }
  return target.endsWith("s") ? `${target}es` : `${target}s`;
}
