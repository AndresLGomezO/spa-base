import type { RowNode, UiLayoutDocument } from "@repo/ui-builder-core";

import type { SkeletonComponentSpec } from "../../types.js";

const DISPLAY_COMPONENT_KINDS = new Set([
  "text",
  "image",
  "icon",
  "date",
  "numeric",
  "badge",
  "metric-kpi",
]);

const RESPONSIVE_BREAKPOINTS = new Set(["base", "sm", "md", "lg", "xl"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFieldPath(value: Record<string, unknown>): string | undefined {
  if (
    typeof value.fieldPath === "string" &&
    value.fieldPath.trim().length > 0
  ) {
    return value.fieldPath.trim();
  }

  const primary = value.primary;
  if (isRecord(primary) && typeof primary.path === "string") {
    const path = primary.path.trim();
    return path.length > 0 ? path : undefined;
  }

  if (typeof value.path === "string" && value.path.trim().length > 0) {
    return value.path.trim();
  }

  return undefined;
}

function normalizeKind(value: unknown): SkeletonComponentSpec["kind"] {
  if (typeof value !== "string") {
    return "text";
  }

  const kind = value.trim();
  if (kind === "nested-layout") {
    return "nested-layout";
  }

  if (DISPLAY_COMPONENT_KINDS.has(kind)) {
    return kind as SkeletonComponentSpec["kind"];
  }

  if (kind === "metric-kpi" || kind === "metric-widget") {
    return "text";
  }

  return "text";
}

function normalizeBreakpoint(
  value: unknown,
): SkeletonComponentSpec["displayFrom"] {
  if (typeof value !== "string") {
    return undefined;
  }
  return RESPONSIVE_BREAKPOINTS.has(value)
    ? (value as SkeletonComponentSpec["displayFrom"])
    : undefined;
}

function normalizeSkeletonComponent(
  value: unknown,
): SkeletonComponentSpec | null {
  if (!isRecord(value)) {
    return null;
  }

  const kind = normalizeKind(value.kind);

  if (kind === "nested-layout") {
    const rawColumns = Array.isArray(value.columns)
      ? value.columns
      : isRecord(value.columns)
        ? Object.values(value.columns)
        : [];

    const columns = rawColumns
      .map((column) => {
        if (!isRecord(column)) {
          return null;
        }
        const rawComponents = Array.isArray(column.components)
          ? column.components
          : isRecord(column.components)
            ? Object.values(column.components)
            : [];
        const components = rawComponents
          .map((component) => normalizeSkeletonComponent(component))
          .filter(
            (component): component is SkeletonComponentSpec =>
              component != null,
          );
        if (components.length === 0) {
          return null;
        }
        return { components };
      })
      .filter(
        (column): column is { components: SkeletonComponentSpec[] } =>
          column != null,
      );

    if (columns.length === 0) {
      return null;
    }

    const columnCount =
      typeof value.columnCount === "number" &&
      Number.isInteger(value.columnCount)
        ? Math.min(Math.max(value.columnCount, 1), 6)
        : columns.length;
    const normalizedColumns = columns.slice(0, columnCount);

    return {
      kind: "nested-layout",
      columnCount: normalizedColumns.length,
      columns: normalizedColumns,
      ...(normalizeBreakpoint(value.displayFrom)
        ? { displayFrom: normalizeBreakpoint(value.displayFrom) }
        : {}),
      ...(normalizeBreakpoint(value.displayTo)
        ? { displayTo: normalizeBreakpoint(value.displayTo) }
        : {}),
    };
  }

  const fieldPath = readFieldPath(value);
  if (!fieldPath) {
    return null;
  }

  return {
    kind,
    fieldPath,
    ...(normalizeBreakpoint(value.displayFrom)
      ? { displayFrom: normalizeBreakpoint(value.displayFrom) }
      : {}),
    ...(normalizeBreakpoint(value.displayTo)
      ? { displayTo: normalizeBreakpoint(value.displayTo) }
      : {}),
  };
}

function rowNodeToSkeleton(row: RowNode): SkeletonComponentSpec | null {
  if (row.type === "nested-layout") {
    const columns = row.columns
      .map((column) => {
        const components = column.rows
          .map((nestedRow) => rowNodeToSkeleton(nestedRow))
          .filter(
            (component): component is SkeletonComponentSpec =>
              component != null,
          );
        return components.length > 0 ? { components } : null;
      })
      .filter(
        (column): column is { components: SkeletonComponentSpec[] } =>
          column != null,
      );

    if (columns.length === 0) {
      return null;
    }

    return {
      kind: "nested-layout",
      columnCount: row.columnCount,
      columns,
      ...(row.displayFrom ? { displayFrom: row.displayFrom } : {}),
      ...(row.displayTo ? { displayTo: row.displayTo } : {}),
    };
  }

  return normalizeSkeletonComponent(row.component);
}

function layoutDocumentToSkeleton(
  layout: UiLayoutDocument,
): SkeletonComponentSpec[] {
  const components: SkeletonComponentSpec[] = [];

  for (const column of layout.root.columns) {
    for (const row of column.rows) {
      const skeleton = rowNodeToSkeleton(row);
      if (skeleton) {
        components.push(skeleton);
      }
    }
  }

  return components;
}

function unwrapLayoutDocument(
  raw: Record<string, unknown>,
): UiLayoutDocument | null {
  if (isRecord(raw.root) && raw.root.type === "root") {
    return raw as unknown as UiLayoutDocument;
  }

  const listItem = raw.listItem;
  if (isRecord(listItem) && isRecord(listItem.root)) {
    return listItem as unknown as UiLayoutDocument;
  }

  const data = raw.data;
  if (isRecord(data)) {
    if (isRecord(data.listItem) && isRecord(data.listItem.root)) {
      return data.listItem as unknown as UiLayoutDocument;
    }
    if (isRecord(data.root) && data.root.type === "root") {
      return data as unknown as UiLayoutDocument;
    }
  }

  return null;
}

function normalizeComponentsArray(
  rawComponents: unknown,
): SkeletonComponentSpec[] {
  const items = Array.isArray(rawComponents)
    ? rawComponents
    : isRecord(rawComponents)
      ? Object.values(rawComponents)
      : [];

  return items
    .map((item) => normalizeSkeletonComponent(item))
    .filter(
      (component): component is SkeletonComponentSpec => component != null,
    );
}

export function coerceLayoutSkeletonOutput(raw: unknown): {
  readonly components: SkeletonComponentSpec[];
} {
  if (!isRecord(raw)) {
    return { components: [] };
  }

  const layoutDocument = unwrapLayoutDocument(raw);
  if (layoutDocument) {
    return { components: layoutDocumentToSkeleton(layoutDocument) };
  }

  const components = normalizeComponentsArray(raw.components);
  if (components.length > 0) {
    return { components };
  }

  if (Array.isArray(raw)) {
    return { components: normalizeComponentsArray(raw) };
  }

  return { components: [] };
}

export function formatLayoutSkeletonValidationErrors(
  issues: readonly {
    readonly path: readonly PropertyKey[];
    readonly message: string;
  }[],
): string[] {
  return issues.slice(0, 5).map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : "(root)";
    return `${path}: ${issue.message}`;
  });
}
