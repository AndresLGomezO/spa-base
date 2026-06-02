import type { SerializableEntityDefinition, ViewConfig } from "@repo/entities";

import { sortFieldsByUiOrder } from "./sort-fields-by-order.js";

function findViewByType(
  definition: SerializableEntityDefinition,
  type: ViewConfig["type"],
): ViewConfig | undefined {
  return definition.ui.views.find((entry) => entry.type === type);
}

export function resolveTableView(
  definition: SerializableEntityDefinition,
  viewName = "default",
): ViewConfig {
  const tableView = findViewByType(definition, "table");
  if (tableView) {
    return tableView;
  }

  const namedView = definition.ui.views.find(
    (entry) => entry.name === viewName,
  );
  if (namedView) {
    return namedView;
  }

  const fallback = definition.ui.views[0];
  if (!fallback) {
    throw new Error(`Entity "${definition.name}" has no configured views.`);
  }
  return fallback;
}

export function resolveCardView(
  definition: SerializableEntityDefinition,
): ViewConfig | null {
  return findViewByType(definition, "card") ?? null;
}

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

  return resolveTableView(definition);
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
