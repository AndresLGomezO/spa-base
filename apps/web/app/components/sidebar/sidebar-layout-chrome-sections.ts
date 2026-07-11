import {
  isRowHolderComponent,
  isSidebarNavComponent,
  resolveLayoutRootColumns,
  type ComponentRowNode,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import {
  SIDEBAR_LAYOUT_FOOTER_ID,
  SIDEBAR_LAYOUT_HEADER_ID,
  SIDEBAR_LAYOUT_NAV_ID,
} from "../../features/ui-builder/create-default-sidebar-layout";

function walkRowsForId(
  rows: readonly RowNode[],
  id: string,
): ComponentRowNode | undefined {
  for (const row of rows) {
    if (row.type === "component" && row.id === id) {
      return row;
    }

    if (row.type !== "component") {
      continue;
    }

    if (isSidebarNavComponent(row.component)) {
      for (const template of [
        row.component.groupItem,
        row.component.subgroupItem,
        row.component.rawItem,
      ] as const) {
        const found = walkRowsForId(template.rows, id);
        if (found) {
          return found;
        }
      }
      continue;
    }

    if (isRowHolderComponent(row.component)) {
      const found = walkRowsForId(row.component.rows, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function findSidebarLayoutRowById(
  layout: UiLayoutDocument,
  id: string,
): ComponentRowNode | undefined {
  for (const column of resolveLayoutRootColumns(layout)) {
    const found = walkRowsForId(column.rows, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

interface SidebarLayoutChromeSections {
  readonly header: ComponentRowNode;
  readonly nav: ComponentRowNode;
  readonly footer: ComponentRowNode;
}

/** Platform-default section ids — when all three exist, runtime uses SidebarHeader/Content/Footer slots. */
export function resolveSidebarLayoutChromeSections(
  layout: UiLayoutDocument,
): SidebarLayoutChromeSections | null {
  const header = findSidebarLayoutRowById(layout, SIDEBAR_LAYOUT_HEADER_ID);
  const nav = findSidebarLayoutRowById(layout, SIDEBAR_LAYOUT_NAV_ID);
  const footer = findSidebarLayoutRowById(layout, SIDEBAR_LAYOUT_FOOTER_ID);
  if (!header || !nav || !footer) {
    return null;
  }
  return { header, nav, footer };
}

export function layoutDocumentFromRow(row: ComponentRowNode): UiLayoutDocument {
  return {
    root: {
      type: "screen-root",
      id: `${row.id}-section-root`,
      gridTemplateColumns: "1fr",
      rows: [row],
    },
    showActions: false,
  };
}
