import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

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
          "border-input-border bg-input-background text-foreground placeholder:text-muted-foreground w-full resize-y rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-input-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
          hasError && "border-danger-500 focus-visible:ring-danger-500",
          className,
        )}
        {...props}
      />
    );
  },
);
