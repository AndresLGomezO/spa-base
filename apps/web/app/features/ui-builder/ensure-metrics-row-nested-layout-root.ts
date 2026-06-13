import {
  createEmptyColumn,
  createLayoutId,
  type NestedLayoutRowNode,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

interface MetricsRowRootNestedLayout {
  readonly row: NestedLayoutRowNode;
  readonly rootColumnIndex: number;
}

function isCanonicalMetricsRowNestedLayoutRoot(
  layout: UiLayoutDocument,
): layout is UiLayoutDocument & {
  readonly root: {
    readonly columns: readonly [
      {
        readonly rows: readonly [NestedLayoutRowNode];
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

  return rootColumn.rows[0]?.type === "nested-layout";
}

export function resolveMetricsRowRootNestedLayout(
  layout: UiLayoutDocument,
): MetricsRowRootNestedLayout | null {
  if (!isCanonicalMetricsRowNestedLayoutRoot(layout)) {
    return null;
  }

  return {
    row: layout.root.columns[0].rows[0],
    rootColumnIndex: 0,
  };
}

function collectRootColumnRows(layout: UiLayoutDocument): readonly RowNode[] {
  const rootColumn = layout.root.columns[0];
  if (!rootColumn) {
    return [];
  }

  if (layout.root.columns.length === 1) {
    return rootColumn.rows;
  }

  return layout.root.columns.flatMap((column) => column.rows);
}

export function ensureMetricsRowNestedLayoutRoot(
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const existing = resolveMetricsRowRootNestedLayout(layout);
  if (existing) {
    return layout;
  }

  const rowsToWrap = collectRootColumnRows(layout);
  const rootColumn = layout.root.columns[0] ?? createEmptyColumn();
  const nestedRowId = createLayoutId("nested");
  const nestedRow: NestedLayoutRowNode = {
    type: "nested-layout",
    id: nestedRowId,
    columnCount: 1,
    columns: [
      {
        ...createEmptyColumn(),
        rows: [...rowsToWrap],
        stackDirection: rootColumn.stackDirection ?? "column",
        styles: rootColumn.styles,
        widthPercent: rootColumn.widthPercent,
        displayFrom: rootColumn.displayFrom,
        displayTo: rootColumn.displayTo,
      },
    ],
    styles: layout.root.styles,
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
          rows: [nestedRow],
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

export function isMetricsRowRootNestedLayoutRow(
  layout: UiLayoutDocument,
  rowId: string,
): boolean {
  return resolveMetricsRowRootNestedLayout(layout)?.row.id === rowId;
}
