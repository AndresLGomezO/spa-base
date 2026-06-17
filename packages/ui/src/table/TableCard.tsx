import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface TableCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function TableCard({ children, className, ...props }: TableCardProps) {
  return (
    <div
      className={cn(
        "border-border bg-card flex min-h-0 flex-col overflow-hidden rounded-lg border shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
