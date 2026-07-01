import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearHookRegistry,
  registerDynamicHook,
  type DataHookDefinition,
} from "@repo/hooks";

import { dispatchChainedEntityHooks } from "./dispatch-chained-entity-hooks.js";

const paymentHook: DataHookDefinition = {
  id: "hook_payment",
  tenantId: "tenant_a",
  name: "Tag payment",
  entity: "payment",
  phase: "before",
  trigger: { operation: "create" },
  actions: [
    {
      type: "setField",
      field: "note",
      value: { kind: "literal", value: "from payment hook" },
    },
  ],
  enabled: true,
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("dispatchChainedEntityHooks", () => {
  beforeEach(() => {
    clearHookRegistry();
  });

  it("runs registered hooks and returns mutated records", async () => {
    registerDynamicHook("tenant_a", paymentHook);

    const result = await dispatchChainedEntityHooks({
      tenantId: "tenant_a",
      entityName: "payment",
      phase: "before",
      operation: "create",
      current: {
        id: "payment_1",
        tenantId: "tenant_a",
        loanId: "loan_1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      depth: 1,
      visitedHookIds: new Set(["hook_loan"]),
      user: { uid: "user_1" },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(result.note).toBe("from payment hook");
  });
});
