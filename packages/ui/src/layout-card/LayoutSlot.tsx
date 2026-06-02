import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import {
  getLayoutAlignClass,
  getLayoutJustifyClass,
  getLayoutNodeStyle,
} from "./layout-styles.js";
import type { LayoutNodeBase } from "./types.js";

export interface LayoutSlotProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string;
  readonly align?: LayoutNodeBase["align"];
  readonly justify?: LayoutNodeBase["justify"];
  readonly minWidth?: LayoutNodeBase["minWidth"];
  readonly maxWidth?: LayoutNodeBase["maxWidth"];
  readonly minHeight?: LayoutNodeBase["minHeight"];
  readonly maxHeight?: LayoutNodeBase["maxHeight"];
  readonly flex?: LayoutNodeBase["flex"];
}

export function LayoutSlot({
  children,
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
}: LayoutSlotProps) {
  const slotStyle = getLayoutNodeStyle({
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    flex,
  });

  const hasAlignment = align !== undefined || justify !== undefined;

  return (
    <div
      className={cn(
        "min-w-0",
        hasAlignment && "flex w-full flex-col",
        getLayoutAlignClass(align),
        getLayoutJustifyClass(justify),
        className,
      )}
      style={{ ...slotStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
