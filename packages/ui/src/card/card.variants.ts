export const cardVariants = {
  default: "bg-card text-card-foreground border-border shadow-md",
  glass:
    "border-border/60 bg-card/70 text-card-foreground shadow-lg ring-1 ring-focus/10 backdrop-blur-md",
} as const;

export type CardVariant = keyof typeof cardVariants;
