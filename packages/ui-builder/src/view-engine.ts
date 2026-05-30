import type { SerializableEntityDefinition, ViewConfig } from "@repo/entities";

import { sortFieldsByUiOrder } from "./sort-fields-by-order.js";

export function resolveActiveView(
  definition: SerializableEntityDefinition,
  viewName?: string,
): ViewConfig {
  if (viewName) {
    const view = definition.ui.views.find((entry) => entry.name === viewName);
    if (!view) {
      throw new Error(
        `View "${viewName}" not found for entity "${definition.name}".`,
      );
    }
    return view;
  }

  const defaultView = definition.ui.views[0];
  if (!defaultView) {
    throw new Error(`Entity "${definition.name}" has no configured views.`);
  }
  return defaultView;
}

export function getTableColumns(
  definition: SerializableEntityDefinition,
  viewName?: string,
): readonly string[] {
  const fields = resolveActiveView(definition, viewName).fields;
  return sortFieldsByUiOrder(fields, definition.ui.fields);
}

export function getDefaultSort(
  definition: SerializableEntityDefinition,
  viewName?: string,
) {
  return resolveActiveView(definition, viewName).defaultSort;
}

export function getViewFilters(
  definition: SerializableEntityDefinition,
  viewName?: string,
) {
  return resolveActiveView(definition, viewName).filters ?? [];
}
