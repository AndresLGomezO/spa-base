import { describe, expect, it, vi } from "vitest";

import { createIndexProvisionEventWriter } from "./index-provision-events.js";

describe("createIndexProvisionEventWriter", () => {
  it("throttles repeated operation_blocked events for the same target", async () => {
    const create = vi.fn(async () => ({ id: "idxevt_1" }));
    const write = createIndexProvisionEventWriter({ create } as never);
    const input = {
      timestamp: new Date().toISOString(),
      event: "operation_blocked" as const,
      collection: "financialItem",
      tenantId: "tenant_a",
      blockedOperation: "list_query" as const,
    };

    await write(input);
    await write(input);

    expect(create).toHaveBeenCalledTimes(1);
  });

  it("still records non-blocked events", async () => {
    const create = vi.fn(async () => ({ id: "idxevt_1" }));
    const write = createIndexProvisionEventWriter({ create } as never);

    await write({
      timestamp: new Date().toISOString(),
      event: "creating",
      collection: "financialItem",
    });
    await write({
      timestamp: new Date().toISOString(),
      event: "creating",
      collection: "financialItem",
    });

    expect(create).toHaveBeenCalledTimes(2);
  });
});
