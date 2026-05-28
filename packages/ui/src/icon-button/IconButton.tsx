import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
  readonly children: ReactNode;
  readonly size?: "sm" | "md";
}

export function IconButton({
  label,
  children,
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-neutral-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-neutral-800/80",
        size === "sm" ? "size-9" : "size-11",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
