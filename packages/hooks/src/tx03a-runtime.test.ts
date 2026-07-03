import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  parseDataHooksCatalogJson,
  runDataHook,
  type DataHookDefinition,
  type HookContext,
  type HookEntityServices,
  type PortableDataHookDefinition,
} from "@repo/hooks";
import { createIncrementPlanRevisionFormulaResolver } from "./test/increment-plan-revision-formula-resolver.js";

const catalogPath = resolve(
  import.meta.dirname,
  "../../../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json",
);

const loanDetails = {
  id: "8f5ddd04-18c9-4ea2-b302-cb6dc4c1e987",
  financialItemId: "f613909f-f7a8-4576-b9d8-8162253facd6",
  amortizationType: "FRENCH",
  termMonths: 60,
  planRevision: 2,
};

const paymentTransaction = {
  id: "tx_1",
  type: "PAYMENT",
  financialItemId: loanDetails.financialItemId,
  amount: 626_684,
};

function loadTx03aHook() {
  const parsed = parseDataHooksCatalogJson(readFileSync(catalogPath, "utf8"));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error("Failed to parse rates data hooks catalog.");
  }

  const hook = parsed.data.dataHooks.find(
    (entry) => entry.name === "Replan loan after payment",
  );
  expect(hook).toBeDefined();
  if (!hook) {
    throw new Error("Replan loan after payment hook not found.");
  }

  return hook;
}

function toDataHookDefinition(
  hook: PortableDataHookDefinition,
): DataHookDefinition {
  return {
    ...hook,
    id: "tx03a_test",
    tenantId: "tenant_test",
    phase: hook.phase ?? "after",
    enabled: hook.enabled ?? true,
    order: hook.order ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("TX-03a runtime", () => {
  it("bumps loanDetails.planRevision after a debt payment transaction", async () => {
    const hook = loadTx03aHook();
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: loanDetails.id,
    }));
    const list = vi.fn<HookEntityServices["list"]>(async (entity) => {
      if (entity === "loanDetails") {
        return [{ ...loanDetails, tenantId: "tenant_test" }];
      }
      return [];
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "transaction",
      event: "transaction.afterCreate",
      current: paymentTransaction,
      user: { uid: "user_test" },
      formulaResolver: createIncrementPlanRevisionFormulaResolver(),
      services: {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
        },
        entities: {
          create: vi.fn(),
          update,
          delete: vi.fn(),
          list,
          get: vi.fn(),
          createMany: vi.fn(async () => []),
        },
      },
    };

    await runDataHook(toDataHookDefinition(hook), context);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toBe("loanDetails");
    expect(update.mock.calls[0]?.[2]).toMatchObject({
      planRevision: 3,
    });
  });

  it("skips non-payment transactions", async () => {
    const hook = loadTx03aHook();
    const update = vi.fn<HookEntityServices["update"]>();

    await runDataHook(toDataHookDefinition(hook), {
      tenantId: "tenant_test",
      entityName: "transaction",
      event: "transaction.afterCreate",
      current: {
        id: "tx_2",
        type: "EXPENSE",
        financialItemId: loanDetails.financialItemId,
        amount: 100_000,
      },
      user: { uid: "user_test" },
      services: {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
        },
        entities: {
          create: vi.fn(),
          update,
          delete: vi.fn(),
          list: vi.fn(async () => []),
          get: vi.fn(),
          createMany: vi.fn(async () => []),
        },
      },
    });

    expect(update).not.toHaveBeenCalled();
  });
});
