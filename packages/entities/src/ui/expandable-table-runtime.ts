import { collectLayoutFieldPaths } from "@repo/ui-builder-core";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import type { GroupedTableColumn, SerializableFieldMeta } from "./types.js";
import { resolveListImageField } from "./partition-expandable-list-fields.js";

function collectFieldPathsFromGroupedColumns(
  columns: readonly GroupedTableColumn[],
): readonly string[] {
  return columns.flatMap((column) =>
    collectLayoutFieldPaths(column.cellLayout),
  );
}

/** Expandable rows always expose expand/collapse UI. */
export function expandableTableHasExpandContent(): boolean {
  return true;
}

/** Field paths rendered only in the expand panel (excluding main row + image). */
export function expandableTableExpandFieldPaths(options: {
  readonly rowExpandLayout: UiLayoutDocument;
  readonly columns: readonly GroupedTableColumn[];
  readonly imageFieldPath?: string;
}): readonly string[] {
  const mainFieldPaths = new Set(
    collectFieldPathsFromGroupedColumns(options.columns),
  );
  if (options.imageFieldPath) {
    mainFieldPaths.add(options.imageFieldPath);
  }

  return collectLayoutFieldPaths(options.rowExpandLayout).filter(
    (path) => !mainFieldPaths.has(path),
  );
}

export function expandableTableHasExpandFieldContent(options: {
  readonly rowExpandLayout: UiLayoutDocument;
  readonly columns: readonly GroupedTableColumn[];
  readonly imageFieldPath?: string;
}): boolean {
  return expandableTableExpandFieldPaths(options).length > 0;
}

export function resolveExpandableTableImageFieldPath(options: {
  readonly imageFieldPath?: string;
  readonly fieldPaths: readonly string[];
  readonly fields: Readonly<Record<string, SerializableFieldMeta>>;
}): string | undefined {
  if (options.imageFieldPath?.trim()) {
    return options.imageFieldPath.trim();
  }

  return resolveListImageField(options.fields, options.fieldPaths);
}
