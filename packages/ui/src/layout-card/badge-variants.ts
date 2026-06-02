export type CardBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default"
  | "active"
  | "pending"
  | "closed"
  | "neutral";

export function resolveBadgeVariant(
  value: unknown,
  variantMap?: Readonly<Record<string, CardBadgeVariant>>,
  displayValue?: unknown,
): CardBadgeVariant {
  if (!variantMap) {
    return "default";
  }

  const candidates: string[] = [];
  for (const candidate of [value, displayValue]) {
    if (candidate === null || candidate === undefined) {
      continue;
    }
    const text = String(candidate).trim();
    if (!text) {
      continue;
    }
    candidates.push(text, text.toLowerCase());
  }

  for (const key of candidates) {
    const match = variantMap[key];
    if (match) {
      return match;
    }
  }

  return "default";
}
