import { createHash } from "node:crypto";

import { stableStringify } from "./stable-stringify.js";

export { extractKeySlice, resolveMetricOwnerId } from "./metric-record-keys.js";

export function buildMetricDocId(
  userId: string,
  group: Record<string, unknown>,
  dimensions: Record<string, unknown>,
): string {
  const payload = stableStringify({ userId, group, dimensions });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export interface MetricRowKeyInput {
  readonly userId: string;
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
}

export interface MetricRowKey {
  readonly userId: string;
  readonly group: Record<string, unknown>;
  readonly dimensions: Record<string, unknown>;
  readonly docId: string;
}

export function buildMetricRowKey(input: MetricRowKeyInput): MetricRowKey {
  const userId = input.userId.trim();
  return {
    userId,
    group: input.group,
    dimensions: input.dimensions,
    docId: buildMetricDocId(userId, input.group, input.dimensions),
  };
}
