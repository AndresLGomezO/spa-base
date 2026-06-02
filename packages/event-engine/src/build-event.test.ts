import { describe, expect, it } from "vitest";

import { buildAggregationEvent } from "./build-event.js";
import { computeEventChecksum } from "./checksum.js";

describe("buildAggregationEvent", () => {
  it("builds stable checksum for same payload", () => {
    const input = {
      tenantId: "tenant_a",
      model: "transaction",
      operation: "UPDATE" as const,
      documentId: "doc_1",
      before: { amount: 10 },
      after: { amount: 20 },
      businessFieldNames: ["amount"],
      schemaVersion: 1,
      timestamp: "2026-06-01T00:00:00.000Z",
    };

    const checksum = computeEventChecksum(input);
    const event = buildAggregationEvent(input);

    expect(event.checksum).toBe(checksum);
    expect(event.changedFields).toEqual(["amount"]);
    expect(event.status).toBe("PENDING");
  });
});
