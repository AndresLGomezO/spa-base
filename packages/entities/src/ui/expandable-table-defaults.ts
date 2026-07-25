import {
  createDefaultTableCellLayout,
  createEmptyTableCellLayout,
  createDefaultRowExpandLayout,
  createEmptyRowExpandLayout,
  createLayoutId,
  collectLayoutFieldPaths,
  resolveLayoutRootColumns,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import {
  partitionExpandableListFields,
  appendImageFieldToViewFields,
  type PartitionExpandableListFieldsResult,
} from "./partition-expandable-list-fields.js";
import type {
  ExpandableTableViewConfig,
  GroupedTableColumn,
  SerializableFieldMeta,
} from "./types.js";

const MAIN_COLUMN_COUNT = 3;

export interface CreateDefaultExpandableTableViewOptions {
  readonly fields?: Readonly<Record<string, SerializableFieldMeta>>;
  readonly fieldLabels?: Readonly<Record<string, string | undefined>>;
}

function formatDefaultFieldLabel(fieldPath: string): string {
  return fieldPath
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function resolveFieldLabel(
  fieldPath: string,
  options?: CreateDefaultExpandableTableViewOptions,
): string {
  const explicit = options?.fieldLabels?.[fieldPath]?.trim();
  if (explicit) {
    return explicit;
  }
  return formatDefaultFieldLabel(fieldPath);
}

function buildMainColumns(
  mainColumnFields: readonly string[],
  options?: CreateDefaultExpandableTableViewOptions,
): GroupedTableColumn[] {
  const columns: GroupedTableColumn[] = [];

  for (let index = 0; index < MAIN_COLUMN_COUNT; index += 1) {
    const fieldPath = mainColumnFields[index];
    columns.push({
      id: `column-${index}`,
      ...(fieldPath ? { label: resolveFieldLabel(fieldPath, options) } : {}),
      cellLayout: fieldPath
        ? createDefaultTableCellLayout([fieldPath], { showLabel: false })
        : createEmptyTableCellLayout(),
    });
  }

  return columns;
}

export function createDefaultExpandableTableView(
  fieldPaths: readonly string[],
  options?: CreateDefaultExpandableTableViewOptions,
): ExpandableTableViewConfig {
  const fields = options?.fields ?? {};
  const partition: PartitionExpandableListFieldsResult =
    partitionExpandableListFields(fieldPaths, fields);

  const columns = buildMainColumns(partition.mainColumnFields, options);

  const fieldRelations = Object.fromEntries(
    Object.entries(fields).map(([name, meta]) => [name, meta.relation]),
  );

  return {
    type: "expandableTable",
    name: "expandable",
    fields: appendImageFieldToViewFields(fieldPaths, partition.imageFieldPath),
    columns,
    rowExpandLayout: partition.isExpandable
      ? createDefaultRowExpandLayout(partition.expandFields, fieldRelations)
      : createEmptyRowExpandLayout(),
    showActions: true,
    ...(partition.imageFieldPath
      ? { imageFieldPath: partition.imageFieldPath }
      : {}),
  };
}

function columnFieldPaths(column: GroupedTableColumn): readonly string[] {
  return collectLayoutFieldPaths(column.cellLayout);
}

function expandableViewNeedsPartitionReconcile(
  view: ExpandableTableViewConfig,
  fieldPaths: readonly string[],
  options?: CreateDefaultExpandableTableViewOptions,
): boolean {
  const partition = partitionExpandableListFields(
    fieldPaths,
    options?.fields ?? {},
  );
  const mainColumnFields = view.columns.flatMap((column) =>
    columnFieldPaths(column),
  );

  if (
    partition.imageFieldPath &&
    mainColumnFields.includes(partition.imageFieldPath)
  ) {
    return true;
  }

  if (view.imageFieldPath !== partition.imageFieldPath) {
    return true;
  }

  const expectedMainFields = [...partition.mainColumnFields];
  while (expectedMainFields.length < MAIN_COLUMN_COUNT) {
    expectedMainFields.push("");
  }

  for (let index = 0; index < MAIN_COLUMN_COUNT; index += 1) {
    if ((mainColumnFields[index] ?? "") !== (expectedMainFields[index] ?? "")) {
      return true;
    }
  }

  const expandFieldPaths = collectLayoutFieldPaths(view.rowExpandLayout).filter(
    (path) =>
      path !== partition.imageFieldPath &&
      !partition.mainColumnFields.includes(path),
  );

  const expectedExpandPaths = [...partition.expandFields];
  if (expandFieldPaths.length !== expectedExpandPaths.length) {
    return true;
  }

  return expectedExpandPaths.some(
    (fieldPath, index) => expandFieldPaths[index] !== fieldPath,
  );
}

/** Re-applies image/main/expand partitioning to an expandable table view. */
export function reconcileExpandableTableView(
  view: ExpandableTableViewConfig,
  fieldPaths: readonly string[],
  options?: CreateDefaultExpandableTableViewOptions,
): ExpandableTableViewConfig {
  const resolvedFieldPaths =
    view.fields.length > 0 ? view.fields : [...fieldPaths];
  const partition = partitionExpandableListFields(
    resolvedFieldPaths,
    options?.fields ?? {},
  );
  const fieldRelations = Object.fromEntries(
    Object.entries(options?.fields ?? {}).map(([name, meta]) => [
      name,
      meta.relation,
    ]),
  );
  const rowExpandLayout = partition.isExpandable
    ? createDefaultRowExpandLayout(partition.expandFields, fieldRelations)
    : createEmptyRowExpandLayout();

  if (
    !expandableViewNeedsPartitionReconcile(view, resolvedFieldPaths, options)
  ) {
    return {
      ...view,
      rowExpandLayout,
    };
  }

  const columns = buildMainColumns(partition.mainColumnFields, options);

  return {
    ...view,
    fields: appendImageFieldToViewFields(
      resolvedFieldPaths,
      partition.imageFieldPath,
    ),
    columns,
    rowExpandLayout,
    showActions: view.showActions,
    ...(view.summaryField !== undefined
      ? { summaryField: view.summaryField }
      : {}),
    ...(partition.imageFieldPath
      ? { imageFieldPath: partition.imageFieldPath }
      : { imageFieldPath: undefined }),
  };
}

export function expandableTableViewFromListItem(
  listItem: UiLayoutDocument,
  fieldPaths: readonly string[],
  options?: CreateDefaultExpandableTableViewOptions,
): ExpandableTableViewConfig {
  const fields = options?.fields ?? {};
  const partition = partitionExpandableListFields(fieldPaths, fields);

  const columns: GroupedTableColumn[] = resolveLayoutRootColumns(listItem).map(
    (column, index) => ({
      id: column.id || `column-${index}`,
      cellLayout: {
        root: {
          type: "root",
          id: createLayoutId("root"),
          columnCount: 1,
          columns: [column],
        },
      },
    }),
  );

  const defaults = createDefaultExpandableTableView(fieldPaths, options);

  const fieldRelations = Object.fromEntries(
    Object.entries(fields).map(([name, meta]) => [name, meta.relation]),
  );

  return {
    type: "expandableTable",
    name: "expandable",
    fields: appendImageFieldToViewFields(fieldPaths, partition.imageFieldPath),
    columns:
      columns.length > 0
        ? columns
            .slice(0, MAIN_COLUMN_COUNT)
            .concat(defaults.columns.slice(columns.length, MAIN_COLUMN_COUNT))
        : defaults.columns,
    rowExpandLayout: partition.isExpandable
      ? createDefaultRowExpandLayout(partition.expandFields, fieldRelations)
      : createEmptyRowExpandLayout(),
    showActions: listItem.showActions,
    ...(partition.imageFieldPath
      ? { imageFieldPath: partition.imageFieldPath }
      : {}),
  };
}
