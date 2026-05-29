import { type LabelHTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly children: ReactNode;
  readonly required?: boolean;
}

export function FieldLabel({
  className,
  children,
  required = false,
  ...props
}: FieldLabelProps) {
  return (
    <label
      className={cn("text-foreground block text-sm font-medium", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="text-danger-600 ml-0.5" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}
