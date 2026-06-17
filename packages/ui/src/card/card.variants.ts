export const cardVariants = {
  default: "bg-card text-card-foreground border-border shadow-card rounded-lg",
  glass:
    "border-border/60 bg-card/70 text-card-foreground shadow-card ring-1 ring-focus/10 backdrop-blur-md rounded-lg",
  gradient:
    "border-0 text-primary-foreground shadow-card rounded-lg [background:var(--gradient-primary)]",
} as const;

export type CardVariant = keyof typeof cardVariants;
