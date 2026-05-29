import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly children: ReactNode;
}

export function FieldError({ className, children, ...props }: FieldErrorProps) {
  return (
    <p
      role="alert"
      className={cn("text-danger-600 dark:text-danger-400 text-sm", className)}
      {...props}
    >
      {children}
    </p>
  );
}
