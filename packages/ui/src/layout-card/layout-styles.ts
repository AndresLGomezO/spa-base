import type { CSSProperties } from "react";

import type { LayoutNodeBase, LayoutSize } from "./types.js";
import { getLayoutSpacingStyle } from "./layout-spacing.js";
import type { LayoutSpacing } from "./layout-spacing.js";

function toCssSize(value: LayoutSize | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === "number" ? `${value}px` : value;
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export function getLayoutNodeStyle(
  node: LayoutNodeBase & LayoutSpacing,
): CSSProperties {
  return {
    minWidth: toCssSize(node.minWidth),
    maxWidth: toCssSize(node.maxWidth),
    minHeight: toCssSize(node.minHeight),
    maxHeight: toCssSize(node.maxHeight),
    flex: node.flex,
    ...getLayoutSpacingStyle(node),
  };
}

export function getLayoutAlignClass(align: LayoutNodeBase["align"]): string {
  return align ? alignClasses[align] : "";
}

export function getLayoutJustifyClass(
  justify: LayoutNodeBase["justify"],
): string {
  return justify ? justifyClasses[justify] : "";
}
