import type {
  ExpandableTableViewConfig,
  GroupedTableColumn,
  SerializableEntityDefinition,
  ViewConfig,
} from "@repo/entities";
import {
  createDefaultExpandableTableView,
  expandableTableViewFromListItem,
  normalizeListItemLayout,
  reconcileExpandableTableView,
} from "@repo/entities";
import { deriveListPresentationFromLayout } from "@repo/ui-builder-core";

export type ListPresentationKind = "card" | "expandableTable";

function resolveListPresentation(
  definition: SerializableEntityDefinition,
): ListPresentationKind {
  if (definition.ui.listItem) {
    return deriveListPresentationFromLayout(definition.ui.listItem);
  }

  const listViewType = definition.ui.listViewType;
  if (listViewType === "card") {
    return "card";
  }
  return "expandableTable";
}

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

const SYSTEM_FIELD_NAMES = new Set([
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
]);

function resolveExpandableFieldPaths(
  definition: SerializableEntityDefinition,
): readonly string[] {
  const tableView = findViewByType(definition, "table");
  if (tableView && tableView.fields.length > 0) {
    return tableView.fields;
  }

  const expandableView = findViewByType(definition, "expandableTable");
  if (expandableView && expandableView.fields.length > 0) {
    return expandableView.fields;
  }

  const cardView = findViewByType(definition, "card");
  if (cardView && cardView.fields.length > 0) {
    return cardView.fields;
  }

  const businessFields = Object.keys(definition.fields).filter(
    (fieldName) =>
      !SYSTEM_FIELD_NAMES.has(fieldName) &&
      definition.fields[fieldName]?.type !== "document",
  );
  return businessFields.length > 0 ? businessFields : ["name"];
}

function buildExpandableTableOptions(definition: SerializableEntityDefinition) {
  return {
    fields: definition.fields,
    fieldLabels: Object.fromEntries(
      Object.entries(definition.ui.fields ?? {}).map(([name, config]) => [
        name,
        config?.label,
      ]),
    ),
  };
}

function synthesizeExpandableTableView(
  definition: SerializableEntityDefinition,
): ExpandableTableViewConfig {
  const fieldPaths = resolveExpandableFieldPaths(definition);
  const options = buildExpandableTableOptions(definition);
  const listItem = normalizeListItemLayout(definition.ui);
  if (listItem) {
    return expandableTableViewFromListItem(listItem, fieldPaths, options);
  }
  return createDefaultExpandableTableView(fieldPaths, options);
}

function normalizeExpandableTableView(
  view: ExpandableTableViewConfig,
  definition: SerializableEntityDefinition,
): ExpandableTableViewConfig {
  const fieldPaths =
    view.fields.length > 0
      ? view.fields
      : resolveExpandableFieldPaths(definition);
  return reconcileExpandableTableView(
    view,
    fieldPaths,
    buildExpandableTableOptions(definition),
  );
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
    return normalizeExpandableTableView(expandableView, definition);
  }

  const namedView = definition.ui.views.find(
    (entry) => entry.name === viewName,
  );
  if (namedView && isExpandableTableView(namedView)) {
    return normalizeExpandableTableView(namedView, definition);
  }

  return synthesizeExpandableTableView(definition);
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

/**
 * Field used for the expandable-row AI Summary action.
 * - view.summaryField set to non-empty → that field
 * - view.summaryField set to `""` → disabled
 * - omitted → inherit recordDetail / detailLayout summaryField
 */
export function getExpandableTableSummaryField(
  definition: SerializableEntityDefinition,
  viewName?: string,
): string | undefined {
  const view = resolveExpandableTableView(definition, viewName);
  if (view.summaryField !== undefined) {
    const trimmed = view.summaryField.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  const detailLayout =
    definition.ui.recordDetailLayout ?? definition.ui.detailLayout;
  const inherited = detailLayout?.summaryField?.trim();
  return inherited && inherited.length > 0 ? inherited : undefined;
}

export function getExpandableTableImageFieldPath(
  definition: SerializableEntityDefinition,
  viewName?: string,
): string | undefined {
  const view = resolveExpandableTableView(definition, viewName);
  return view.imageFieldPath;
}

export function getExpandableTableViewConfig(
  definition: SerializableEntityDefinition,
  viewName?: string,
): ExpandableTableViewConfig {
  return resolveExpandableTableView(definition, viewName);
}

/** Toolbar sort/filter/search fields for the active list presentation. */
export function getListToolbarFields(
  definition: SerializableEntityDefinition,
): readonly string[] {
  const presentation = resolveListPresentation(definition);
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

export { resolveListPresentation };
