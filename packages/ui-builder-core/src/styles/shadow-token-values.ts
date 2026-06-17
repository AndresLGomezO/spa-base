import type { ShadowToken } from "./style-types.js";

const SHADOW_TOKENS = new Set<string>(["none", "card"]);

export function isShadowTokenValue(value: string): value is ShadowToken {
  return SHADOW_TOKENS.has(value);
}

export function shadowTokenClass(token: ShadowToken): string {
  switch (token) {
    case "none":
      return "shadow-none";
    case "card":
      return "shadow-card";
    default:
      return "shadow-none";
  }
}
