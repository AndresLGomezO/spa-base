export const cardVariants = {
  default: "bg-background border-border shadow-md",
  glass:
    "border-border/60 bg-background/70 shadow-lg ring-1 ring-primary-500/10 backdrop-blur-md",
} as const;

export type CardVariant = keyof typeof cardVariants;
