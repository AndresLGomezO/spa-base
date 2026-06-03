import { cn } from "@repo/theme/utils";

import type { LayoutNode } from "./types.js";

export interface LayoutColumnHighlight {
  readonly depth: number;
  readonly columnIndex: number;
  readonly gridId?: string;
}

const INNER_COLUMN_ID_PATTERN = /^__col:(\d+)$/;

const HIGHLIGHT_CLASS_BY_DEPTH = [
  "bg-muted/35 ring-muted/60 rounded-md ring-1 ring-inset",
  "bg-muted/55 ring-muted/70 rounded-md ring-1 ring-inset",
  "bg-muted/75 ring-muted/80 rounded-md ring-1 ring-inset",
] as const;

export function resolveLayoutColumnIndex(
  node: LayoutNode,
  fallbackIndex: number,
): number {
  if (typeof node.id === "string") {
    const match = INNER_COLUMN_ID_PATTERN.exec(node.id);
    if (match) {
      const parsed = Number.parseInt(match[1]!, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return fallbackIndex;
}

export function getLayoutColumnHighlightClass(
  highlights: readonly LayoutColumnHighlight[] | undefined,
  params: {
    readonly depth: number;
    readonly columnIndex: number;
    readonly gridId?: string;
  },
): string | undefined {
  if (!highlights?.length) {
    return undefined;
  }

  const match = highlights.find(
    (highlight) =>
      highlight.depth === params.depth &&
      highlight.columnIndex === params.columnIndex &&
      (highlight.gridId === undefined || highlight.gridId === params.gridId),
  );

  if (!match) {
    return undefined;
  }

  const depthIndex = Math.min(
    Math.max(0, params.depth),
    HIGHLIGHT_CLASS_BY_DEPTH.length - 1,
  );

  return cn(
    "min-w-0 self-stretch p-1 transition-colors",
    HIGHLIGHT_CLASS_BY_DEPTH[depthIndex],
  );
}
