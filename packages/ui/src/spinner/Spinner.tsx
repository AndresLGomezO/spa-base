import { type HTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

export type SpinnerSize = "sm" | "md" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "size-4 border-2",
  md: "size-8 border-2",
  lg: "size-10 border-[3px]",
};

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  readonly size?: SpinnerSize;
  readonly ariaLabel: string;
}

export function Spinner({
  size = "md",
  ariaLabel,
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "border-primary inline-block shrink-0 animate-spin rounded-full border-t-transparent",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
