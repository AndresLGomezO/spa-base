import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function Alert({ className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-800 dark:bg-danger-950/40 dark:text-danger-300 w-full rounded-md border px-3 py-2 text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
