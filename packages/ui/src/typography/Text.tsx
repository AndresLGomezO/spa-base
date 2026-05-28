import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly variant?: "default" | "muted" | "caption";
  readonly as?: "p" | "span";
  readonly children: ReactNode;
}

const variantStyles = {
  default: "text-foreground text-sm",
  muted: "text-muted text-sm",
  caption: "text-muted text-xs",
} as const;

export function Text({
  variant = "default",
  as: Component = "p",
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Component className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </Component>
  );
}
