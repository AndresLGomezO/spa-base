import { describe, expect, it, vi } from "vitest";

import {
  runDataHook,
  type DataHookDefinition,
  type HookContext,
  type HookEntityServices,
  type PortableDataHookDefinition,
} from "@repo/hooks";
import { createIncrementPlanRevisionFormulaResolver } from "./test/increment-plan-revision-formula-resolver.js";
import { loadRatesDataHookByName } from "./test/load-rates-data-hooks-catalog.js";

const loanDetails = {
  id: "8f5ddd04-18c9-4ea2-b302-cb6dc4c1e987",
  financialItemId: "f613909f-f7a8-4576-b9d8-8162253facd6",
  interestRate: 25.31,
  rateType: "VARIABLE",
  amortizationType: "FRENCH",
  termMonths: 60,
  creditLimit: 17_500_000,
  planRevision: 0,
};

const financialItem = {
  id: "f613909f-f7a8-4576-b9d8-8162253facd6",
  name: "Crediservice Rotativo",
  itemType: "REVOLVING_CREDIT",
  currentBalance: 16_913_000,
};

const loanUtilization = {
  id: "lu_1",
  financialItemId: financialItem.id,
  amount: 500_000,
  utilizedAt: "2026-07-01",
  description: "Store purchase",
};

function loadLu01Hook() {
  return loadRatesDataHookByName("Apply utilization to balance and replan");
}

function toDataHookDefinition(
  hook: PortableDataHookDefinition,
): DataHookDefinition {
  return {
    ...hook,
    id: "lu01_test",
    tenantId: "tenant_test",
    phase: hook.phase ?? "after",
    enabled: hook.enabled ?? true,
    order: hook.order ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("LU-01 runtime", () => {
  it("increases currentBalance and bumps planRevision on utilization create", async () => {
    const hook = loadLu01Hook();
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: "updated",
    }));
    const list = vi.fn<HookEntityServices["list"]>(async (entity) => {
      if (entity === "financialItem") {
        return [{ ...financialItem, tenantId: "tenant_test" }];
      }
      if (entity === "loanDetails") {
        return [{ ...loanDetails, tenantId: "tenant_test" }];
      }
      return [];
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "loanUtilization",
      event: "loanUtilization.afterCreate",
      current: loanUtilization,
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

    expect(update).toHaveBeenCalledTimes(2);

    const financialItemUpdate = update.mock.calls.find(
      ([entity]) => entity === "financialItem",
    );
    expect(financialItemUpdate?.[2]).toMatchObject({
      currentBalance: financialItem.currentBalance + loanUtilization.amount,
    });

    const loanDetailsUpdate = update.mock.calls.find(
      ([entity]) => entity === "loanDetails",
    );
    expect(loanDetailsUpdate?.[2]).toMatchObject({
      planRevision: 1,
    });
  });
});
