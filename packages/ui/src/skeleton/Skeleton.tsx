import { type HTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-muted/30 relative overflow-hidden rounded-md",
        "before:absolute before:inset-0",
        "before:animate-shimmer",
        "before:bg-gradient-to-r",
        "before:via-foreground/5 before:from-transparent before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
