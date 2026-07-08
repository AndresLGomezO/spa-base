import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { type CardGlowColor, resolveCardGlowBackground } from "./card-glow.js";
import { cardVariants, type CardVariant } from "./card.variants";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: CardVariant;
  readonly glow?: CardGlowColor;
  readonly children: ReactNode;
}

export function Card({
  variant = "default",
  glow,
  className,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border p-8",
        variant === "glass" &&
          !glow &&
          "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent",
        cardVariants[variant],
        className,
      )}
      style={
        glow
          ? { ...style, backgroundImage: resolveCardGlowBackground(glow) }
          : style
      }
      {...props}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {children}
      </div>
    </div>
  );
}
