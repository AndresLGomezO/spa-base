export const buttonVariants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active focus-visible:ring-focus/50",
  outline:
    "border-border bg-background text-foreground border hover:bg-hover active:bg-active focus-visible:ring-focus/30",
  ghost:
    "text-foreground hover:bg-hover active:bg-active focus-visible:ring-focus/30",
  ai: [
    "btn-ai relative overflow-hidden border border-transparent",
    "bg-[linear-gradient(var(--color-background),var(--color-background)),linear-gradient(90deg,hsl(var(--primary)),#8b5cf6_50%,#22d3ee)]",
    "bg-origin-border [background-clip:padding-box,border-box]",
    "text-foreground shadow-[0_0_20px_color-mix(in_oklab,#8b5cf6_18%,transparent)]",
    "hover:bg-[linear-gradient(color-mix(in_oklab,hsl(var(--primary))_8%,var(--color-background)),color-mix(in_oklab,hsl(var(--primary))_8%,var(--color-background))),linear-gradient(90deg,hsl(var(--primary)),#8b5cf6_50%,#22d3ee)]",
    "active:opacity-95 focus-visible:ring-violet-400/40",
  ].join(" "),
} as const;

export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
