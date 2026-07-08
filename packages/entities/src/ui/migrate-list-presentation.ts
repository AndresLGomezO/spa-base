import type {
  EntityUIConfig,
  EntityListViewType,
  LegacyEntityListViewType,
} from "./types.js";
import {
  createDefaultExpandableTableView,
  expandableTableViewFromListItem,
  reconcileExpandableTableView,
  type CreateDefaultExpandableTableViewOptions,
} from "./expandable-table-defaults.js";
import { normalizeEntityViews } from "./normalize-entity-views.js";
import { normalizeListItemLayout } from "./normalize-list-item-layout.js";
import { isExpandableTableViewConfig } from "./types.js";

export type EntityUiConfigWithLegacyPresentation = Omit<
  EntityUIConfig,
  "listViewType"
> & {
  readonly listViewType?: LegacyEntityListViewType;
};

export type MigrateListPresentationOptions =
  CreateDefaultExpandableTableViewOptions;

function resolveListViewType(
  listViewType: LegacyEntityListViewType | undefined,
): EntityListViewType | undefined {
  if (listViewType === "compact") {
    return "expandableTable";
  }
  return listViewType;
}

function getQueryableFieldPaths(ui: EntityUIConfig): readonly string[] {
  const tableView = ui.views.find((view) => view.type === "table");
  if (tableView && tableView.fields.length > 0) {
    return tableView.fields;
  }
  const expandableView = ui.views.find(
    (view) => view.type === "expandableTable",
  );
  if (expandableView && expandableView.fields.length > 0) {
    return expandableView.fields;
  }
  const cardView = ui.views.find((view) => view.type === "card");
  if (cardView && cardView.fields.length > 0) {
    return cardView.fields;
  }
  return [];
}

function seedExpandableTableView(
  ui: EntityUIConfig,
  fieldPaths: readonly string[],
  options?: MigrateListPresentationOptions,
) {
  const listItem = normalizeListItemLayout(ui);
  if (listItem) {
    return expandableTableViewFromListItem(listItem, fieldPaths, options);
  }
  return createDefaultExpandableTableView(
    fieldPaths.length > 0 ? fieldPaths : ["name"],
    options,
  );
}

/** Migrates legacy compact presentation and seeds expandableTable view when needed. */
export function migrateListPresentation(
  ui: EntityUiConfigWithLegacyPresentation,
  options?: MigrateListPresentationOptions,
): EntityUIConfig {
  const { listViewType: legacyListViewType, ...rest } = ui;
  const listViewType = resolveListViewType(legacyListViewType);
  const hasExpandableView = rest.views.some(
    (view) => view.type === "expandableTable",
  );

  let views = rest.views;

  if (listViewType === "expandableTable") {
    const fieldPaths = getQueryableFieldPaths(rest);
    if (fieldPaths.length > 0) {
      if (!hasExpandableView) {
        views = [...views, seedExpandableTableView(rest, fieldPaths, options)];
      } else {
        views = views.map((view) =>
          view.type === "expandableTable" && isExpandableTableViewConfig(view)
            ? reconcileExpandableTableView(view, fieldPaths, options)
            : view,
        );
      }
    }
  }

  return {
    ...rest,
    ...(listViewType !== undefined ? { listViewType } : {}),
    views: normalizeEntityViews(views),
  };
}

export function findExpandableTableView(ui: Pick<EntityUIConfig, "views">) {
  const view = ui.views.find((entry) => entry.type === "expandableTable");
  return view && isExpandableTableViewConfig(view) ? view : undefined;
}
