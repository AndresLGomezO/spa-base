import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { Heading } from "../typography/Heading";
import { Text } from "../typography/Text";

export interface BuilderPageShellProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly bodyScrollable?: boolean;
}

export function BuilderPageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyScrollable = true,
}: BuilderPageShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-8 overflow-hidden",
        className,
      )}
    >
      <header className="shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <Heading level={1}>{title}</Heading>
            {subtitle ? (
              typeof subtitle === "string" ? (
                <Text>{subtitle}</Text>
              ) : (
                subtitle
              )
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </header>
      <div
        className={cn(
          "min-h-0 flex-1",
          bodyScrollable
            ? "overflow-y-auto overflow-x-hidden"
            : "flex flex-col overflow-hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
