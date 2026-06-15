import {
  createDefaultComponent,
  createLayoutId,
  ensureContainerRoot,
  resolveRootContainer,
  type ColumnNode,
  type RowNode,
  type UiComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import { sanitizeListComponentConfig } from "./sanitize-list-component-config.js";

function readComponentFieldPath(component: UiComponentConfig): string {
  if ("primary" in component && component.primary?.type === "field") {
    return component.primary.path;
  }
  if ("fieldPath" in component && typeof component.fieldPath === "string") {
    return component.fieldPath;
  }
  return "name";
}

function repairComponent(
  component: UiComponentConfig,
  fieldPath: string,
): UiComponentConfig {
  return sanitizeListComponentConfig(component.kind, fieldPath, component);
}

function repairRows(
  rows: readonly RowNode[],
  defaultFieldPath: string,
): RowNode[] {
  const repaired: RowNode[] = [];

  for (const row of rows) {
    if (row.type === "nested-layout") {
      const columns = row.columns
        .map((column) => repairColumn(column, defaultFieldPath))
        .filter((column) => column.rows.length > 0);

      if (columns.length === 0) {
        continue;
      }

      repaired.push({
        type: "nested-layout",
        id: row.id,
        columnCount: columns.length,
        columns,
        ...(row.displayFrom ? { displayFrom: row.displayFrom } : {}),
        ...(row.displayTo ? { displayTo: row.displayTo } : {}),
        ...(row.styles ? { styles: row.styles } : {}),
      });
      continue;
    }

    const fieldPath = readComponentFieldPath(row.component) || defaultFieldPath;
    repaired.push({
      type: "component",
      id: row.id,
      component: repairComponent(row.component, fieldPath),
      ...(row.displayFrom ? { displayFrom: row.displayFrom } : {}),
      ...(row.displayTo ? { displayTo: row.displayTo } : {}),
      ...(row.styles ? { styles: row.styles } : {}),
    });
  }

  if (repaired.length === 0) {
    repaired.push({
      type: "component",
      id: createLayoutId("row"),
      component: createDefaultComponent("text", defaultFieldPath),
    });
  }

  return repaired;
}

function repairColumn(
  column: ColumnNode,
  defaultFieldPath: string,
): ColumnNode {
  return {
    ...column,
    rows: repairRows(column.rows, defaultFieldPath),
  };
}

export function repairListLayoutDocument(
  layout: UiLayoutDocument,
  defaultFieldPath = "name",
): UiLayoutDocument {
  const withContainer = ensureContainerRoot(layout);
  const rootContainer = resolveRootContainer(withContainer);
  if (!rootContainer) {
    return withContainer;
  }

  const repairedRows = repairRows(rootContainer.config.rows, defaultFieldPath);
  const rootColumn = withContainer.root.columns[0] ?? {
    id: createLayoutId("col"),
    rows: [],
  };

  return {
    ...withContainer,
    root: {
      ...withContainer.root,
      columnCount: 1,
      columns: [
        {
          ...rootColumn,
          rows: [
            {
              ...rootContainer.row,
              component: {
                ...rootContainer.config,
                rows: repairedRows,
              },
            },
          ],
        },
      ],
    },
  };
}
