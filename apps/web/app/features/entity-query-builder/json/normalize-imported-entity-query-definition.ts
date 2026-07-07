import type { EntityQueryDefinitionFormData } from "@repo/entity-queries/browser";

export function normalizeImportedEntityQueryDefinitionForEdit(input: {
  readonly data: EntityQueryDefinitionFormData;
  readonly existingName: string;
  readonly existingSourceEntity: string;
}): {
  readonly data: EntityQueryDefinitionFormData;
  readonly preservedIdentityFields: readonly ("name" | "sourceEntity")[];
} {
  const preservedIdentityFields: ("name" | "sourceEntity")[] = [];
  let data = input.data;

  if (input.data.name.trim() !== input.existingName) {
    preservedIdentityFields.push("name");
    data = { ...data, name: input.existingName };
  }

  if (input.data.sourceEntity !== input.existingSourceEntity) {
    preservedIdentityFields.push("sourceEntity");
    data = { ...data, sourceEntity: input.existingSourceEntity };
  }

  return { data, preservedIdentityFields };
}
