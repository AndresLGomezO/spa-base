export const buttonVariants = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500/50",
  outline:
    "border-border bg-background text-foreground border hover:bg-neutral-50 dark:hover:bg-neutral-900 focus-visible:ring-primary-500/30",
  ghost:
    "text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:ring-primary-500/30",
} as const;

export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
