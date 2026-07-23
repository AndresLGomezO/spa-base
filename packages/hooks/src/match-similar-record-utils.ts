/**
 * Embedding similarity helpers for `matchSimilarRecord` (no AI SDK deps).
 */

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function readNumericArrayField(
  record: Record<string, unknown>,
  fieldName: string,
): number[] | null {
  const raw = record[fieldName];
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const values: number[] = [];
  for (const entry of raw) {
    if (typeof entry !== "number" || !Number.isFinite(entry)) {
      return null;
    }
    values.push(entry);
  }
  return values;
}

export function pickBestEmbeddingMatch<
  T extends Record<string, unknown>,
>(options: {
  readonly query: readonly number[];
  readonly candidates: readonly T[];
  readonly embeddingField: string;
  readonly minScore: number;
}): { readonly record: T; readonly score: number } | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const candidate of options.candidates) {
    const embedding = readNumericArrayField(candidate, options.embeddingField);
    if (!embedding) {
      continue;
    }
    const score = cosineSimilarity(options.query, embedding);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  if (!best || bestScore < options.minScore) {
    return null;
  }
  return { record: best, score: bestScore };
}
