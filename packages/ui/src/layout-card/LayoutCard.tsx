import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface LayoutCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly interactive?: boolean;
}

export function LayoutCard({
  children,
  actions,
  interactive = false,
  className,
  ...props
}: LayoutCardProps) {
  return (
    <article
      className={cn(
        "border-border bg-card relative flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all duration-200",
        interactive &&
          "hover:border-border/80 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]",
        className,
      )}
      {...props}
    >
      {actions ? (
        <div className="absolute end-3 top-3 z-10 shrink-0">{actions}</div>
      ) : null}
      <div className={cn("min-h-0 w-full min-w-0", actions && "pe-11")}>
        {children}
      </div>
    </article>
  );
}
