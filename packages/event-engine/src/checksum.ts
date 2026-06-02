import { createHash } from "node:crypto";

import { stableStringify } from "@repo/metrics-engine";

import type { AggregationEventOperation } from "./types.js";

export function computeEventChecksum(input: {
  readonly tenantId: string;
  readonly model: string;
  readonly documentId: string;
  readonly operation: AggregationEventOperation;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
}): string {
  const payload = [
    input.tenantId,
    input.model,
    input.documentId,
    input.operation,
    stableStringify(input.before),
    stableStringify(input.after),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}
