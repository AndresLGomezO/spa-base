import { createHash } from "node:crypto";

export function hashSourceValue(value: unknown): string {
  const serialized = JSON.stringify(value ?? null);
  return createHash("sha256").update(serialized).digest("hex").slice(0, 16);
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n… [truncated]`;
}

export function buildTenantAiContextDocId(
  kind: "theme" | "entityCatalog" | "entity",
  scopeKey?: string,
): string {
  if (kind === "entity" && scopeKey) {
    return `entity__${scopeKey}`;
  }
  return kind;
}
