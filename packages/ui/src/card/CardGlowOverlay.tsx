import type { CardGlowColor } from "./card-glow.js";
import { resolveCardGlowBackground } from "./card-glow.js";

interface CardGlowOverlayProps {
  readonly glow: CardGlowColor;
}

export function CardGlowOverlay({ glow }: CardGlowOverlayProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
      style={{ backgroundImage: resolveCardGlowBackground(glow) }}
    />
  );
}
