import type { EntityDefinitionFormData } from "@repo/dynamic-entities";
import { fieldDefinitionSchema } from "@repo/dynamic-entities";

import type { FieldDefinitionInput } from "../../../lib/api-client";

export interface EntityFormStateExportInput {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead: boolean;
  readonly inMemoryListQueries: boolean;
  readonly hiddenFromNav: boolean;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly navIcon: string;
  readonly displayField: string;
}

export function exportEntityFormState(
  input: EntityFormStateExportInput,
): EntityDefinitionFormData {
  const navOrder = input.navOrder.trim();
  const navCategoryId = input.navCategoryId.trim();
  const displayField = input.displayField.trim();
  const navIcon = input.navIcon.trim();

  return {
    name: input.name.trim(),
    label: input.label.trim(),
    ...(input.description.trim()
      ? { description: input.description.trim() }
      : {}),
    fields: input.fields.map((field) => fieldDefinitionSchema.parse(field)),
    ...(input.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(input.inMemoryListQueries ? { inMemoryListQueries: true } : {}),
    ...(input.hiddenFromNav ? { hiddenFromNav: true } : {}),
    ...(navCategoryId ? { navCategoryId } : {}),
    ...(navOrder ? { navOrder: Number.parseInt(navOrder, 10) } : {}),
    ...(displayField ? { displayField } : {}),
    ...(navIcon ? { navIcon } : {}),
  };
}

export interface EntityFormStateImportResult {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly fields: FieldDefinitionInput[];
  readonly tenantWideRead: boolean;
  readonly inMemoryListQueries: boolean;
  readonly hiddenFromNav: boolean;
  readonly navCategoryId: string;
  readonly navOrder: string;
  readonly navIcon: string;
  readonly displayField: string;
}

export function importEntityFormState(
  data: EntityDefinitionFormData,
): EntityFormStateImportResult {
  return {
    name: data.name,
    label: data.label,
    description: data.description ?? "",
    fields: [...data.fields],
    tenantWideRead: data.tenantWideRead ?? false,
    inMemoryListQueries: data.inMemoryListQueries ?? false,
    hiddenFromNav: data.hiddenFromNav ?? false,
    navCategoryId: data.navCategoryId ?? "",
    navOrder:
      data.navOrder !== undefined && data.navOrder !== null
        ? String(data.navOrder)
        : "",
    navIcon: data.navIcon ?? "",
    displayField: data.displayField ?? "",
  };
}
