import type { SerializableEntityDefinition } from "@repo/entities";

import { buildEntityColumnDescriptors } from "../../components/entity/build-entity-column-descriptors";

function resolveViewFilterFieldNames(
  definition: SerializableEntityDefinition,
  configuredFields: readonly string[] | undefined,
): readonly string[] {
  if (configuredFields && configuredFields.length > 0) {
    return configuredFields.filter((field) => field in definition.fields);
  }

  return Object.keys(definition.fields);
}

export function resolveAvailableViewFilterFieldNames(
  definition: SerializableEntityDefinition,
): readonly string[] {
  const fieldNames = resolveViewFilterFieldNames(definition, undefined);

  return buildEntityColumnDescriptors({
    definition,
    columns: fieldNames,
    getOneToManyCellValue: () => null,
  })
    .filter((column) => column.filterable !== false)
    .map((column) => column.id);
}

export function resolveViewSearchFieldNames(
  definition: SerializableEntityDefinition,
  configuredFields: readonly string[] | undefined,
): readonly string[] {
  const candidates = resolveViewFilterFieldNames(definition, configuredFields);

  return candidates.filter((fieldName) => {
    const fieldMeta = definition.fields[fieldName];
    const fieldUi = definition.ui.fields?.[fieldName];

    if (fieldMeta?.sensitive === true || fieldMeta?.type === "relation") {
      return fieldUi?.searchable === true;
    }

    if (fieldUi?.searchable !== undefined) {
      return fieldUi.searchable;
    }

    if (fieldMeta?.isArray === true) {
      return fieldMeta.type === "string" || fieldMeta.type === "enum";
    }

    return fieldMeta?.type === "string";
  });
}
