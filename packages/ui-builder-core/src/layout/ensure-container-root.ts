import { createLayoutId } from "../builder/id.js";
import { createEmptyColumn, createEmptyLayout } from "../builder/mutations.js";
import type { ContainerComponentConfig } from "../types/component.js";
import { isContainerComponent } from "../types/component.js";
import type {
  ComponentRowNode,
  NestedLayoutRowNode,
  RowNode,
  UiLayoutDocument,
} from "../types/layout.js";

export interface RootContainerResolution {
  readonly row: ComponentRowNode;
  readonly config: ContainerComponentConfig;
  readonly rootColumnIndex: number;
}

function isCanonicalContainerRoot(
  layout: UiLayoutDocument,
): layout is UiLayoutDocument & {
  readonly root: {
    readonly columns: readonly [
      {
        readonly rows: readonly [
          ComponentRowNode & {
            readonly component: ContainerComponentConfig;
          },
        ];
      },
    ];
  };
} {
  if (layout.root.columns.length !== 1) {
    return false;
  }

  const rootColumn = layout.root.columns[0];
  if (!rootColumn || rootColumn.rows.length !== 1) {
    return false;
  }

  const row = rootColumn.rows[0];
  return row?.type === "component" && isContainerComponent(row.component);
}

export function resolveRootContainer(
  layout: UiLayoutDocument,
): RootContainerResolution | null {
  if (!isCanonicalContainerRoot(layout)) {
    return null;
  }

  const row = layout.root.columns[0].rows[0];
  if (!isContainerComponent(row.component)) {
    return null;
  }

  return {
    row,
    config: row.component,
    rootColumnIndex: 0,
  };
}

function collectRowsFromNestedLayoutRoot(
  nestedRow: NestedLayoutRowNode,
): readonly RowNode[] {
  if (nestedRow.columnCount === 1) {
    return nestedRow.columns[0]?.rows ?? [];
  }

  return nestedRow.columns.flatMap((column) => column.rows);
}

function collectRowsForContainerWrap(layout: UiLayoutDocument): {
  readonly rows: readonly RowNode[];
  readonly styles: ContainerComponentConfig["styles"];
} {
  const existing = resolveRootContainer(layout);
  if (existing) {
    return {
      rows: existing.config.rows,
      styles: existing.config.styles,
    };
  }

  const nestedRootColumn = layout.root.columns[0];
  if (
    layout.root.columns.length === 1 &&
    nestedRootColumn?.rows.length === 1 &&
    nestedRootColumn.rows[0]?.type === "nested-layout"
  ) {
    const nestedRow = nestedRootColumn.rows[0];
    const rows =
      nestedRow.columnCount === 1
        ? collectRowsFromNestedLayoutRoot(nestedRow)
        : [nestedRow];

    return {
      rows,
      styles: nestedRow.styles ?? nestedRootColumn.styles ?? layout.root.styles,
    };
  }

  const rootColumn = layout.root.columns[0] ?? createEmptyColumn();
  const rowsToWrap =
    layout.root.columns.length === 1
      ? rootColumn.rows
      : layout.root.columns.flatMap((column) => column.rows);

  return {
    rows: rowsToWrap,
    styles: rootColumn.styles ?? layout.root.styles,
  };
}

function isMultiColumnRootLayout(layout: UiLayoutDocument): boolean {
  return layout.root.columnCount > 1 || layout.root.columns.length > 1;
}

export function ensureContainerRoot(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  if (isCanonicalContainerRoot(layout)) {
    return layout;
  }

  if (isMultiColumnRootLayout(layout)) {
    return layout;
  }

  const { rows, styles } = collectRowsForContainerWrap(layout);
  const rootColumn = layout.root.columns[0] ?? createEmptyColumn();
  const containerRowId = createLayoutId("row");
  const containerRow: ComponentRowNode = {
    type: "component",
    id: containerRowId,
    component: {
      kind: "container",
      rows: [...rows],
      styles: styles ? [...styles] : undefined,
    },
  };

  return {
    ...layout,
    root: {
      ...layout.root,
      columnCount: 1,
      styles: undefined,
      columns: [
        {
          ...rootColumn,
          rows: [containerRow],
          stackDirection: undefined,
          styles: undefined,
          widthPercent: undefined,
          displayFrom: undefined,
          displayTo: undefined,
        },
      ],
    },
  };
}

export function isRootContainerRow(
  layout: UiLayoutDocument,
  rowId: string,
): boolean {
  return resolveRootContainer(layout)?.row.id === rowId;
}

export function resolveRootContainerRows(
  layout: UiLayoutDocument,
): readonly RowNode[] {
  return resolveRootContainer(layout)?.config.rows ?? [];
}

export function resolveRootContainerLocator(layout: UiLayoutDocument): {
  readonly scope: "container";
  readonly columnIndex: number;
  readonly containerRowId: string;
} | null {
  const rootContainer = resolveRootContainer(layout);
  if (!rootContainer) {
    return null;
  }

  return {
    scope: "container",
    columnIndex: rootContainer.rootColumnIndex,
    containerRowId: rootContainer.row.id,
  };
}

export function beginContainerRootLayout(): {
  readonly layout: UiLayoutDocument;
  readonly containerLocator: {
    readonly scope: "container";
    readonly columnIndex: number;
    readonly containerRowId: string;
  };
} {
  const layout = ensureContainerRoot(createEmptyLayout(1));
  const containerLocator = resolveRootContainerLocator(layout);
  if (!containerLocator) {
    throw new Error("Failed to initialize container root layout");
  }

  return { layout, containerLocator };
}
