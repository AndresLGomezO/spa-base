import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

import {
  formControlFocusRingClassName,
  formControlFocusRingErrorClassName,
} from "../focus-ring/focus-ring-classes";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError = false, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "border-input-border bg-input-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        formControlFocusRingClassName,
        hasError && "border-danger-500",
        hasError && formControlFocusRingErrorClassName,
        className,
      )}
      {...props}
    />
  );
});
