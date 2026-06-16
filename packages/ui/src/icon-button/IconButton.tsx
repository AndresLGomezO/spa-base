import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { focusRingInsetClassName } from "../focus-ring/focus-ring-classes";

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
        "text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-hover/80 focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-60",
        focusRingInsetClassName,
        size === "sm" ? "size-9" : "size-11",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
