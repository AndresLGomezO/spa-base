import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import {
  isValidLayoutFieldPath,
  isValidTableColumnFieldPath,
  listLayoutFieldOptions,
  listTableColumnFieldOptions,
  normalizeTableColumnFieldPath,
  sanitizeTableColumnFieldPaths,
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

export function buildLayoutFieldPaths(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  return listLayoutFieldOptions(definition);
}

export function buildTableFieldPaths(
  definition: FieldPathValidationDefinition,
): readonly string[] {
  return listTableColumnFieldOptions(definition);
}

export function normalizeTableFieldPaths(
  definition: FieldPathValidationDefinition,
  fields: readonly string[],
): readonly string[] {
  return sanitizeTableColumnFieldPaths(definition, fields);
}

export function validateLayoutFieldPaths(
  fields: readonly string[],
  definition: FieldPathValidationDefinition,
  label: string,
  allowedPaths?: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const isAllowed = allowedPaths
      ? allowedPaths.has(field)
      : isValidLayoutFieldPath(definition, field);
    if (!isAllowed) {
      errors.push(`${label}: invalid field path "${field}"`);
    }
  }
  return errors;
}

export function validateTableFieldPaths(
  fields: readonly string[],
  definition: FieldPathValidationDefinition,
  label: string,
  allowedPaths?: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  for (const field of fields) {
    const normalized = normalizeTableColumnFieldPath(definition, field);
    const isAllowed = allowedPaths
      ? allowedPaths.has(normalized)
      : isValidTableColumnFieldPath(definition, normalized);
    if (!isAllowed) {
      errors.push(`${label}: invalid field path "${field}"`);
    }
  }
  return errors;
}

export function normalizeTableFieldOutput(
  definition: FieldPathValidationDefinition,
  fields: readonly string[],
): readonly string[] {
  return fields.map((field) =>
    normalizeTableColumnFieldPath(definition, field),
  );
}
