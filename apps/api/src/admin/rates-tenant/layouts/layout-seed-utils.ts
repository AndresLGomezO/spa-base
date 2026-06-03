import type { UiLayoutDocument } from "@repo/entities";

type MutableRow = {
  readonly type: string;
  readonly id?: string;
  readonly columns?: readonly MutableColumn[];
  readonly [key: string]: unknown;
};

type MutableColumn = {
  readonly id?: string;
  readonly rows?: readonly MutableRow[];
  readonly [key: string]: unknown;
};

/** Assigns stable, deterministic layout node ids for repeatable emulator seeds. */
export function remapLayoutDocumentIds(
  layout: UiLayoutDocument,
  prefix = "fp-card",
): UiLayoutDocument {
  let counter = 0;
  const nextId = (kind: string): string => `${prefix}-${kind}-${counter++}`;

  const clone = structuredClone(layout) as unknown as {
    root: {
      id: string;
      columns: MutableColumn[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  clone.root.id = nextId("root");
  clone.root.columns = clone.root.columns.map((column) => {
    const nextColumn: MutableColumn = { ...column, id: nextId("col") };
    if (column.rows) {
      return {
        ...nextColumn,
        rows: column.rows.map((row) => remapRow(row, nextId)),
      };
    }
    return nextColumn;
  });

  return clone as unknown as UiLayoutDocument;
}

function remapRow(
  row: MutableRow,
  nextId: (kind: string) => string,
): MutableRow {
  if (row.type === "component") {
    return { ...row, id: nextId("row") };
  }

  if (row.type === "nested-layout" && row.columns) {
    return {
      ...row,
      id: nextId("nested"),
      columns: row.columns.map((column) => {
        const nextColumn: MutableColumn = { ...column, id: nextId("col") };
        if (column.rows) {
          return {
            ...nextColumn,
            rows: column.rows.map((nestedRow) => remapRow(nestedRow, nextId)),
          };
        }
        return nextColumn;
      }),
    };
  }

  return row;
}
