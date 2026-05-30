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
        "border-destructive/25 bg-destructive/10 text-destructive w-full rounded-md border px-3 py-2 text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
