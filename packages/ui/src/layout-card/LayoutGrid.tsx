import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import {
  getLayoutAlignClass,
  getLayoutJustifyClass,
  getLayoutNodeStyle,
} from "./layout-styles.js";
import type { LayoutDirection, LayoutNodeBase } from "./types.js";

export interface LayoutGridProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly direction?: LayoutDirection;
  readonly gap?: number;
  readonly columns?: number | string;
  /** Force CSS grid layout (e.g. when using Tailwind grid-cols-* classes). */
  readonly display?: "grid" | "flex";
  readonly className?: string;
  readonly align?: LayoutNodeBase["align"];
  readonly justify?: LayoutNodeBase["justify"];
  readonly minWidth?: LayoutNodeBase["minWidth"];
  readonly maxWidth?: LayoutNodeBase["maxWidth"];
  readonly minHeight?: LayoutNodeBase["minHeight"];
  readonly maxHeight?: LayoutNodeBase["maxHeight"];
  readonly flex?: LayoutNodeBase["flex"];
}

export function LayoutGrid({
  children,
  direction = "row",
  gap = 12,
  columns,
  display,
  className,
  align,
  justify,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  flex,
  style,
  ...props
}: LayoutGridProps) {
  const gridStyle = getLayoutNodeStyle({
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    flex,
  });

  const useCssGrid =
    display === "grid" || (columns !== undefined && direction === "row");
  const useFlex = !useCssGrid;

  return (
    <div
      className={cn(
        useCssGrid ? "grid" : "flex",
        useFlex && direction === "row" ? "flex-row" : "",
        useFlex && direction === "column" ? "flex-col" : "",
        getLayoutAlignClass(align),
        getLayoutJustifyClass(justify),
        className,
      )}
      style={{
        ...gridStyle,
        ...style,
        gap: style?.gap ?? `${gap}px`,
        ...(useCssGrid
          ? {
              gridTemplateColumns:
                typeof columns === "number"
                  ? `repeat(${columns}, minmax(0, 1fr))`
                  : columns,
            }
          : {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface LayoutStackProps extends Omit<
  LayoutGridProps,
  "columns" | "type"
> {}

export function LayoutStack({
  direction = "column",
  gap = 4,
  ...props
}: LayoutStackProps) {
  return <LayoutGrid direction={direction} gap={gap} {...props} />;
}
