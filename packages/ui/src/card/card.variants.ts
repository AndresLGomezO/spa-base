import {
  cardGlassSurfaceClasses,
  cardOpaqueSurfaceClasses,
} from "./card-glass.js";

export const cardVariants = {
  default: cardOpaqueSurfaceClasses,
  glass: `${cardGlassSurfaceClasses} text-card-foreground`,
  gradient:
    "border-0 text-primary-foreground shadow-card rounded-[var(--radius-lg)] [background:var(--gradient-primary)]",
} as const;

export type CardVariant = keyof typeof cardVariants;
