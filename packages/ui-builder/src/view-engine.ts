import type {
  ExpandableTableViewConfig,
  GroupedTableColumn,
  SerializableEntityDefinition,
  ViewConfig,
} from "@repo/entities";

function isExpandableTableView(
  view: ViewConfig,
): view is ExpandableTableViewConfig {
  return view.type === "expandableTable";
}

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

export function resolveExpandableTableView(
  definition: SerializableEntityDefinition,
  viewName = "expandable",
): ExpandableTableViewConfig {
  const expandableView = findViewByType(definition, "expandableTable");
  if (expandableView && isExpandableTableView(expandableView)) {
    return expandableView;
  }

  const namedView = definition.ui.views.find(
    (entry) => entry.name === viewName,
  );
  if (namedView && isExpandableTableView(namedView)) {
    return namedView;
  }

  throw new Error(
    `Entity "${definition.name}" has no expandableTable view configured.`,
  );
}

export function getExpandableTableColumns(
  definition: SerializableEntityDefinition,
  viewName?: string,
): readonly GroupedTableColumn[] {
  return [...resolveExpandableTableView(definition, viewName).columns];
}

export function getExpandableTableRowExpandLayout(
  definition: SerializableEntityDefinition,
  viewName?: string,
) {
  return resolveExpandableTableView(definition, viewName).rowExpandLayout;
}

export function getExpandableTableShowActions(
  definition: SerializableEntityDefinition,
  viewName?: string,
): boolean {
  return resolveExpandableTableView(definition, viewName).showActions !== false;
}

/** Toolbar sort/filter/search fields for the active list presentation. */
export function getListToolbarFields(
  definition: SerializableEntityDefinition,
): readonly string[] {
  const presentation = definition.ui.listViewType ?? "table";
  if (presentation === "expandableTable") {
    try {
      return [...resolveExpandableTableView(definition).fields];
    } catch {
      return getTableColumns(definition);
    }
  }
  return getTableColumns(definition);
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
  return [...resolveTableView(definition, viewName).fields];
}

export function getTableViewShowActions(
  definition: SerializableEntityDefinition,
  viewName?: string,
): boolean {
  const view = resolveTableView(definition, viewName);
  if (view.type !== "table") {
    return true;
  }
  return view.showActions !== false;
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
