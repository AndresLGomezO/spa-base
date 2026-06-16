import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

import {
  formControlFocusRingClassName,
  formControlFocusRingErrorClassName,
} from "../focus-ring/focus-ring-classes";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, hasError = false, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "border-input-border bg-input-background text-foreground placeholder:text-muted-foreground w-full resize-y rounded-md border px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          formControlFocusRingClassName,
          hasError && "border-danger-500",
          hasError && formControlFocusRingErrorClassName,
          className,
        )}
        {...props}
      />
    );
  },
);
