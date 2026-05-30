export const buttonVariants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active focus-visible:ring-focus/50",
  outline:
    "border-border bg-background text-foreground border hover:bg-hover active:bg-active focus-visible:ring-focus/30",
  ghost:
    "text-foreground hover:bg-hover active:bg-active focus-visible:ring-focus/30",
} as const;

export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
