import {
  createScreenRootNode,
  isContainerComponent,
  resolveLayoutRootColumns,
  type ComponentRowNode,
  type ContainerComponentConfig,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

/**
 * Single root container under screen-root (app-shell header/footer pattern).
 * Returns null when the layout is empty or not a single container shell.
 */
export function resolveAppShellRootContainerRow(
  layout: UiLayoutDocument,
): ComponentRowNode | null {
  const rows = resolveLayoutRootColumns(layout).flatMap(
    (column) => column.rows,
  );
  if (rows.length !== 1) {
    return null;
  }
  const row = rows[0];
  if (row?.type !== "component" || !isContainerComponent(row.component)) {
    return null;
  }
  return row;
}

/**
 * Layout of the root container's children only.
 * Prefer `promotedContainerRowId` on RecursiveLayoutRenderer so locators stay
 * aligned with the full tree; this helper remains for tests and migrations.
 */
export function createAppShellRootChildrenLayout(
  rootContainer: ComponentRowNode & {
    readonly component: ContainerComponentConfig;
  },
): UiLayoutDocument {
  const childRows = rootContainer.component.rows;
  const stackDirection = rootContainer.component.stackDirection ?? "column";
  const childCount = Math.max(childRows.length, 1);

  return {
    root: createScreenRootNode(childRows, {
      gridTemplateColumns:
        stackDirection === "row" ? `repeat(${childCount}, auto)` : "1fr",
    }),
    showActions: false,
  };
}
