import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { cardOpaqueSurfaceClasses } from "../card/card-glass.js";

export interface TableCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function TableCard({ children, className, ...props }: TableCardProps) {
  return (
    <div
      className={cn(
        cardOpaqueSurfaceClasses,
        "flex min-h-0 flex-col overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
