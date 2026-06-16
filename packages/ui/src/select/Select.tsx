import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

import {
  formControlFocusRingClassName,
  formControlFocusRingErrorClassName,
} from "../focus-ring/focus-ring-classes";

export type SelectSize = "sm" | "default";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly hasError?: boolean;
  readonly selectSize?: SelectSize;
}

const sizeClasses: Record<SelectSize, string> = {
  default: "h-auto min-h-10 px-3 py-2",
  sm: "h-8 min-h-8 px-2 py-1 md:h-9 md:min-h-9 md:px-3 md:py-1.5",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { className, hasError = false, selectSize = "default", children, ...props },
    ref,
  ) {
    return (
      <select
        ref={ref}
        className={cn(
          "border-input-border bg-input-background text-foreground w-full max-w-full appearance-none rounded-md border text-sm shadow-sm transition-colors",
          formControlFocusRingClassName,
          "disabled:cursor-not-allowed disabled:opacity-60",
          "bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat pr-9",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
          sizeClasses[selectSize],
          hasError && "border-danger-500",
          hasError && formControlFocusRingErrorClassName,
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
