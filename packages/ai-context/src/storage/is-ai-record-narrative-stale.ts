import type { AiRecordSummaryRecord } from "./ai-record-summary.schema.js";

function resolveNarrativeExpectedHash(
  record: Pick<
    AiRecordSummaryRecord,
    "contextHash" | "variantContextHashes" | "narratives"
  >,
  variant: string,
): string | undefined {
  const variantHash = record.variantContextHashes?.[variant]?.trim();
  if (variantHash) return variantHash;
  const hashes = record.variantContextHashes;
  if (hashes && Object.keys(hashes).length > 0) {
    // Sibling variants own the map; this variant was not bumped.
    return record.narratives?.[variant]?.sourceHash?.trim();
  }
  return record.contextHash?.trim();
}

/**
 * True when the narrative for `variant` is missing or its `sourceHash` does
 * not match the expected context hash for that variant.
 *
 * Browser-safe (no Node APIs). Prefer this over importing the package root.
 */
export function isAiRecordNarrativeStale(
  record: Pick<
    AiRecordSummaryRecord,
    "contextHash" | "variantContextHashes" | "narratives"
  >,
  variant = "default",
): boolean {
  const expected = resolveNarrativeExpectedHash(record, variant);
  if (!expected) return false;
  const narrative = record.narratives?.[variant];
  if (!narrative) return true;
  return narrative.sourceHash.trim() !== expected;
}
