import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import {
  isValidFormFieldPath,
  listFormFieldOptions,
  type FieldPathValidationDefinition,
} from "@repo/ui-builder-core";

export function toFieldPathDefinition(
  entity: DefinedEntity<string, FieldDefinitions>,
): FieldPathValidationDefinition {
  return {
    name: entity.metadata.name,
    fields: entity.metadata.fields as FieldPathValidationDefinition["fields"],
  };
}

export function buildFormFieldPaths(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  return listFormFieldOptions(definition);
}

export function validateFormFieldPaths(
  fields: readonly string[],
  definition: FieldPathValidationDefinition,
  label: string,
  allowedPaths?: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const isAllowed = allowedPaths
      ? allowedPaths.has(field)
      : isValidFormFieldPath(definition, field);
    if (!isAllowed) {
      errors.push(`${label}: invalid field path "${field}"`);
    }
  }
  return errors;
}
