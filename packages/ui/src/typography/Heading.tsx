import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly level?: 1 | 2 | 3;
  readonly children: ReactNode;
}

const levelStyles = {
  1: "text-2xl font-semibold tracking-tight",
  2: "text-xl font-semibold tracking-tight",
  3: "text-lg font-medium",
} as const;

export function Heading({
  level = 1,
  className,
  children,
  ...props
}: HeadingProps) {
  const shared = cn(levelStyles[level], className);

  if (level === 2) {
    return (
      <h2 className={shared} {...props}>
        {children}
      </h2>
    );
  }

  if (level === 3) {
    return (
      <h3 className={shared} {...props}>
        {children}
      </h3>
    );
  }

  return (
    <h1 className={shared} {...props}>
      {children}
    </h1>
  );
}
