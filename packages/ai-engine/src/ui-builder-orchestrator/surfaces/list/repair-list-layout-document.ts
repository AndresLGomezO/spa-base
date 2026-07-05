import {
  asEditableLayoutRoot,
  createDefaultComponent,
  createLayoutId,
  ensureContainerRoot,
  isContainerComponent,
  isGridComponent,
  resolveRootContainer,
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
    if (row.type === "component" && isGridComponent(row.component)) {
      const tracks = row.component.rows.map((track) => {
        if (
          track.type !== "component" ||
          !isContainerComponent(track.component)
        ) {
          return track;
        }

        return {
          ...track,
          component: {
            ...track.component,
            rows: repairRows(track.component.rows, defaultFieldPath),
          },
        };
      });

      repaired.push({
        ...row,
        component: {
          ...row.component,
          rows: tracks,
        },
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
  const editableRoot = asEditableLayoutRoot(withContainer.root);
  const rootColumn = editableRoot.columns[0] ?? {
    id: createLayoutId("col"),
    rows: [],
  };

  return {
    ...withContainer,
    root: {
      ...editableRoot,
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
