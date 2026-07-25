export type FieldAccessForPrompt = "read" | "write" | "none";

export type PiiLevel = "public" | "masked" | "excluded";

export interface RedactForPromptOptions {
  readonly record: Readonly<Record<string, unknown>>;
  /** Field → PII level from entity AI summary template / catalog. */
  readonly piiLevel?: Readonly<Record<string, PiiLevel>>;
  /** Field → RBAC access map. Fields with `none` are dropped. */
  readonly fieldAccessMap?: Readonly<Record<string, FieldAccessForPrompt>>;
  /** Extra keys always stripped (embeddings, search mirrors, etc.). */
  readonly alwaysStripKeys?: readonly string[];
}

const DEFAULT_STRIP_KEYS = [
  "embedding",
  "aiSummaryEmbedding",
  "tenantId",
] as const;

function shouldStripKey(
  key: string,
  alwaysStrip: ReadonlySet<string>,
): boolean {
  if (alwaysStrip.has(key)) return true;
  if (key.endsWith("SearchTokens") || key.endsWith("Search")) return true;
  return false;
}

function maskValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length <= 4) return "***";
    return `${value.slice(0, 2)}***${value.slice(-1)}`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return "***";
  }
  return "***";
}

/**
 * Strip PII / RBAC-denied fields before a record enters an LLM prompt or tool result.
 * `piiLevel` is independent of role; `fieldAccessMap` enforces per-field RBAC.
 */
export function redactForPrompt(
  options: RedactForPromptOptions,
): Record<string, unknown> {
  const alwaysStrip = new Set<string>([
    ...DEFAULT_STRIP_KEYS,
    ...(options.alwaysStripKeys ?? []),
  ]);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(options.record)) {
    if (shouldStripKey(key, alwaysStrip)) {
      continue;
    }

    const access = options.fieldAccessMap?.[key];
    if (access === "none") {
      continue;
    }

    const pii = options.piiLevel?.[key] ?? "public";
    if (pii === "excluded") {
      continue;
    }
    if (pii === "masked") {
      out[key] = maskValue(value);
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v !== "object")
    ) {
      out[key] = value;
    }
  }

  return out;
}
