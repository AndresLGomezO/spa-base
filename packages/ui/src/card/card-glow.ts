export type CardGlowColor =
  | "blue"
  | "green"
  | "red"
  | "gold"
  | "neutral"
  | "success"
  | "danger"
  | "warning";

export function resolveCardGlowGradient(glow: CardGlowColor): string {
  return `var(--gradient-card-glow-${glow})`;
}

export function resolveCardGlowBackground(glow: CardGlowColor): string {
  const gradient = resolveCardGlowGradient(glow);
  return `${gradient}, linear-gradient(var(--color-card), var(--color-card))`;
}
