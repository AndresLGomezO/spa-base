import type {
  ColumnNode,
  ComponentRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";
import type {
  UiComponentConfig,
  ViewFilterComponentConfig,
  ViewSearchComponentConfig,
} from "../types/component.js";
import { isContainerComponent } from "../types/component.js";

function isViewSearchComponent(
  config: UiComponentConfig,
): config is ViewSearchComponentConfig {
  return config.kind === "view-search";
}

function isViewFilterComponent(
  config: UiComponentConfig,
): config is ViewFilterComponentConfig {
  return config.kind === "view-filter";
}

function mergeSearchIntoFilter(
  filterConfig: ViewFilterComponentConfig,
  searchConfig: ViewSearchComponentConfig,
): ViewFilterComponentConfig {
  return {
    ...filterConfig,
    enableSearch: true,
    searchPlaceholder:
      searchConfig.placeholder?.trim() ||
      filterConfig.searchPlaceholder?.trim() ||
      undefined,
  };
}

function convertSearchRowToFilter(
  row: ComponentRowNode,
  searchConfig: ViewSearchComponentConfig,
): ComponentRowNode {
  return {
    ...row,
    component: {
      kind: "view-filter",
      enableSearch: true,
      enableFilters: false,
      filters: [],
      searchPlaceholder: searchConfig.placeholder?.trim() || undefined,
      styles: searchConfig.styles,
    },
  };
}

function migrateColumnRows(rows: readonly RowNode[]): RowNode[] {
  const migrated: RowNode[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = migrateRowNode(rows[index]);
    if (row.type !== "component" || !isViewSearchComponent(row.component)) {
      migrated.push(row);
      continue;
    }

    const searchConfig = row.component;
    const nextRow = rows[index + 1];
    const previousRow = migrated[migrated.length - 1];

    if (
      nextRow?.type === "component" &&
      isViewFilterComponent(nextRow.component)
    ) {
      migrated.push({
        ...migrateRowNode(nextRow),
        type: "component",
        component: mergeSearchIntoFilter(nextRow.component, searchConfig),
      });
      index += 1;
      continue;
    }

    if (
      previousRow?.type === "component" &&
      isViewFilterComponent(previousRow.component)
    ) {
      migrated[migrated.length - 1] = {
        ...previousRow,
        component: mergeSearchIntoFilter(previousRow.component, searchConfig),
      };
      continue;
    }

    migrated.push(convertSearchRowToFilter(row, searchConfig));
  }

  return migrated;
}

function migrateColumnNode(column: ColumnNode): ColumnNode {
  return {
    ...column,
    rows: migrateColumnRows(column.rows),
  };
}

function migrateRowNode(row: RowNode): RowNode {
  if (row.type === "component") {
    if (isContainerComponent(row.component)) {
      return {
        ...row,
        component: {
          ...row.component,
          rows: migrateColumnRows(row.component.rows),
        },
      };
    }

    return row;
  }

  return {
    ...row,
    columns: row.columns.map(migrateColumnNode),
  };
}

export function migrateViewSearchFilterLayout(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  return {
    ...layout,
    root: {
      ...layout.root,
      columns: layout.root.columns.map(migrateColumnNode),
    },
  };
}
