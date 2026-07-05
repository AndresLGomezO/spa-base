import {
  ensureContainerRoot,
  isContainerComponent,
  isGridComponent,
  resolveLayoutRootColumns,
  resolveRootContainer,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

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
  if (kind === "nested-layout" || kind === "grid") {
    return "grid";
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

  if (kind === "grid" || kind === "nested-layout") {
    const rawTracks = Array.isArray(value.tracks)
      ? value.tracks
      : Array.isArray(value.columns)
        ? value.columns
        : isRecord(value.columns)
          ? Object.values(value.columns)
          : isRecord(value.tracks)
            ? Object.values(value.tracks)
            : [];

    const tracks = rawTracks
      .map((track) => {
        if (!isRecord(track)) {
          return null;
        }
        const rawComponents = Array.isArray(track.components)
          ? track.components
          : isRecord(track.components)
            ? Object.values(track.components)
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
        (track): track is { components: SkeletonComponentSpec[] } =>
          track != null,
      );

    if (tracks.length === 0) {
      return null;
    }

    const trackCount =
      typeof value.trackCount === "number" && Number.isInteger(value.trackCount)
        ? Math.min(Math.max(value.trackCount, 1), 6)
        : typeof value.columnCount === "number" &&
            Number.isInteger(value.columnCount)
          ? Math.min(Math.max(value.columnCount, 1), 6)
          : tracks.length;
    const normalizedTracks = tracks.slice(0, trackCount);

    return {
      kind: "grid",
      trackCount: normalizedTracks.length,
      tracks: normalizedTracks,
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
  if (row.type === "component" && isContainerComponent(row.component)) {
    const components = row.component.rows
      .map((innerRow) => rowNodeToSkeleton(innerRow))
      .filter(
        (component): component is SkeletonComponentSpec => component != null,
      );

    if (components.length === 1) {
      return components[0]!;
    }

    return null;
  }

  if (row.type === "component" && isGridComponent(row.component)) {
    const tracks = row.component.rows
      .map((trackRow) => {
        if (
          trackRow.type !== "component" ||
          trackRow.component.kind !== "container"
        ) {
          return null;
        }
        const components = trackRow.component.rows
          .map((nestedRow) => rowNodeToSkeleton(nestedRow))
          .filter(
            (component): component is SkeletonComponentSpec =>
              component != null,
          );
        return components.length > 0 ? { components } : null;
      })
      .filter(
        (track): track is { components: SkeletonComponentSpec[] } =>
          track != null,
      );

    if (tracks.length === 0) {
      return null;
    }

    return {
      kind: "grid",
      trackCount: tracks.length,
      tracks,
      ...(row.displayFrom ? { displayFrom: row.displayFrom } : {}),
      ...(row.displayTo ? { displayTo: row.displayTo } : {}),
    };
  }

  return normalizeSkeletonComponent(row.component);
}

function layoutDocumentToSkeleton(
  layout: UiLayoutDocument,
): SkeletonComponentSpec[] {
  const normalized = ensureContainerRoot(layout);
  const rootContainer = resolveRootContainer(normalized);
  const rows =
    rootContainer?.config.rows ??
    resolveLayoutRootColumns(normalized).flatMap((column) => column.rows);
  const components: SkeletonComponentSpec[] = [];

  for (const row of rows) {
    const skeleton = rowNodeToSkeleton(row);
    if (skeleton) {
      components.push(skeleton);
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
