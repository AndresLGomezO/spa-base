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
import { createRatesFormulaResolver } from "./rates-formula-test-utils.js";

const catalogPath = resolve(
  import.meta.dirname,
  "../../../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json",
);

const parentCard = {
  id: "9f660323-25ca-413c-86a8-710a375be97f",
  name: "Mastercard Black",
  itemType: "CREDIT_CARD",
  currentBalance: 23_000_000,
  revolvingBalance: 1_000_000,
};

const childLoan = {
  id: "a1b2c3d4-cc01-4000-8000-000000000001",
  name: "Mastercard — Compra a cuotas (26M)",
  itemType: "LOAN",
  parentFinancialItemId: parentCard.id,
  currentBalance: 22_000_000,
  balanceSheetRole: "NONE",
};

const childLoanDetails = {
  id: "a1b2c3d4-cc01-4000-8000-000000000002",
  financialItemId: childLoan.id,
  interestRateQuote: "NMV",
  interestRate: 1.3,
  rateType: "VARIABLE",
  amortizationType: "FRENCH",
  termMonths: 60,
  originalPrincipal: 26_000_000,
};

function loadCatalogHook(name: string): PortableDataHookDefinition {
  const parsed = parseDataHooksCatalogJson(readFileSync(catalogPath, "utf8"));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error("Failed to parse rates data hooks catalog.");
  }

  const hook = parsed.data.dataHooks.find((entry) => entry.name === name);
  expect(hook).toBeDefined();
  if (!hook) {
    throw new Error(`Hook not found: ${name}`);
  }

  return hook;
}

function toDataHookDefinition(
  hook: PortableDataHookDefinition,
  id: string,
): DataHookDefinition {
  return {
    ...hook,
    id,
    tenantId: "tenant_test",
    phase: hook.phase ?? "after",
    enabled: hook.enabled ?? true,
    order: hook.order ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function createFinancialItemList(
  items: ReadonlyArray<Record<string, unknown> & { readonly id: string }>,
): HookEntityServices["list"] {
  return vi.fn<HookEntityServices["list"]>(async (entity) => {
    if (entity === "financialItem") {
      return items.map((item) => ({ ...item, tenantId: "tenant_test" }));
    }
    return [];
  });
}

describe("CC-SYNC runtime", () => {
  it("recomputes host card currentBalance from revolvingBalance + child balances", async () => {
    const hook = loadCatalogHook(
      "Sync card balance after installment child update",
    );
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: parentCard.id,
    }));

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "financialItem",
      event: "financialItem.afterUpdate",
      current: childLoan,
      previous: { ...childLoan, currentBalance: 22_500_000 },
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create: vi.fn(),
          createMany: vi.fn(async () => []),
          update,
          delete: vi.fn(),
          list: createFinancialItemList([parentCard, childLoan]),
          get: vi.fn(),
        },
      },
    };

    await runDataHook(toDataHookDefinition(hook, "cc_sync_test"), context);

    const parentUpdate = update.mock.calls.find(
      ([entity, id]) => entity === "financialItem" && id === parentCard.id,
    );
    expect(parentUpdate).toBeDefined();
    const patch = parentUpdate?.[2] as Record<string, unknown> | undefined;
    expect(patch?.currentBalance).toBe(23_000_000);
  });

  it("recomputes host card when revolvingBalance changes", async () => {
    const hook = loadCatalogHook("Sync card balance after revolving change");
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: parentCard.id,
    }));
    const cardWithRevolving = {
      ...parentCard,
      revolvingBalance: 2_000_000,
    };

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "financialItem",
      event: "financialItem.afterUpdate",
      current: cardWithRevolving,
      previous: parentCard,
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create: vi.fn(),
          createMany: vi.fn(async () => []),
          update,
          delete: vi.fn(),
          list: createFinancialItemList([cardWithRevolving, childLoan]),
          get: vi.fn(),
        },
      },
    };

    await runDataHook(toDataHookDefinition(hook, "cc_sync_rev_test"), context);

    const parentUpdate = update.mock.calls.find(
      ([entity, id]) => entity === "financialItem" && id === parentCard.id,
    );
    const patch = parentUpdate?.[2] as Record<string, unknown> | undefined;
    expect(patch?.currentBalance).toBe(24_000_000);
  });
});

describe("CC-INIT runtime", () => {
  it("seeds child LOAN balance from originalPrincipal when linked to a card", async () => {
    const hook = loadCatalogHook("Initialize card installment loan");
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: childLoan.id,
    }));
    const childWithoutBalance = { ...childLoan, currentBalance: undefined };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === childLoan.id) {
        return childWithoutBalance;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });
    const list = vi.fn<HookEntityServices["list"]>(async (entity) => {
      if (entity === "financialItem") {
        return [{ ...childWithoutBalance, tenantId: "tenant_test" }];
      }
      return [];
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      current: childLoanDetails,
      user: { uid: "user_test" },
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create: vi.fn(),
          createMany: vi.fn(async () => []),
          update,
          delete: vi.fn(),
          list,
          get,
        },
      },
    };

    await runDataHook(toDataHookDefinition(hook, "cc_init_test"), context);

    const childUpdate = update.mock.calls.find(
      ([entity, id]) => entity === "financialItem" && id === childLoan.id,
    );
    expect(childUpdate).toBeDefined();
    const patch = childUpdate?.[2] as Record<string, unknown> | undefined;
    expect(patch?.currentBalance).toBe(26_000_000);
  });

  it("does not overwrite child balance when host link is absent", async () => {
    const hook = loadCatalogHook("Initialize card installment loan");
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: "e6c42ac0-9ccb-4e64-90ba-e87272d29af0",
    }));
    const mortgageItem = {
      id: "e6c42ac0-9ccb-4e64-90ba-e87272d29af0",
      itemType: "MORTGAGE",
      currentBalance: 349_726_807.63,
    };
    const mortgageDetails = {
      id: "7f7fd68c-948e-455c-a131-b4903601c217",
      financialItemId: mortgageItem.id,
      originalPrincipal: 361_000_000,
    };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === mortgageItem.id) {
        return mortgageItem;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });
    const list = vi.fn<HookEntityServices["list"]>(async (entity) => {
      if (entity === "financialItem") {
        return [{ ...mortgageItem, tenantId: "tenant_test" }];
      }
      return [];
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      current: mortgageDetails,
      user: { uid: "user_test" },
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create: vi.fn(),
          createMany: vi.fn(async () => []),
          update,
          delete: vi.fn(),
          list,
          get,
        },
      },
    };

    await runDataHook(
      toDataHookDefinition(hook, "cc_init_mortgage_test"),
      context,
    );

    const childUpdate = update.mock.calls.find(
      ([entity]) => entity === "financialItem",
    );
    const patch = childUpdate?.[2] as Record<string, unknown> | undefined;
    expect(patch?.currentBalance).toBe(349_726_807.63);
  });
});

describe("LD-01 on card installment child", () => {
  it("creates payment schedule rows for 26M / 60mo / 1.3% NMV FRENCH child LOAN", async () => {
    const hook = loadCatalogHook("Generate loan payment plan");
    const create = vi.fn<HookEntityServices["create"]>(async () => ({
      id: "ps_1",
    }));
    const createMany = vi.fn<HookEntityServices["createMany"]>(
      async (_entity, records) => records.map(() => ({ id: "ps_1" })),
    );
    const parentItem = {
      id: childLoan.id,
      amount: 626_757,
      currentBalance: 26_000_000,
      nextDueDate: "2026-07-09",
    };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === childLoan.id) {
        return parentItem;
      }
      if (entity === "loanDetails" && id === childLoanDetails.id) {
        return childLoanDetails;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      current: childLoanDetails,
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          createMany,
          update: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => []),
          get,
        },
      },
    };

    await runDataHook(toDataHookDefinition(hook, "cc_sync_test"), context);

    expect(createMany).toHaveBeenCalledTimes(1);
    const rows = createMany.mock.calls[0]?.[1] ?? [];
    const firstRow = rows[0] as Record<string, unknown> | undefined;
    expect(firstRow?.expectedAmount).toEqual(expect.any(Number));
    expect(firstRow?.expectedAmount as number).toBeGreaterThan(600_000);
    expect(firstRow?.expectedAmount as number).toBeLessThan(650_000);
  });
});

describe("recurring schedule hooks", () => {
  it("creates initial payment schedule rows with formula-backed due dates", async () => {
    const hook = loadCatalogHook("Create initial schedule row");
    const createMany = vi.fn<HookEntityServices["createMany"]>(
      async (_entity, records) => records.map(() => ({ id: "ps_1" })),
    );
    const create = vi.fn<HookEntityServices["create"]>(async () => ({
      id: "ps_1",
    }));
    const financialItem = {
      id: "fi_recurring_1",
      name: "Rent",
      amount: 1_500_000,
      frequency: "MONTHLY",
      nextDueDate: "2026-07-01",
      scheduleHorizonMonths: 3,
    };

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "financialItem",
      event: "financialItem.afterCreate",
      current: financialItem,
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          createMany,
          update: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => []),
          get: vi.fn(),
        },
      },
    };

    await runDataHook(
      toDataHookDefinition(hook, "schedule_create_test"),
      context,
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    const rows = createMany.mock.calls[0]?.[1] ?? [];
    expect(rows).toHaveLength(3);
    expect((rows[0] as Record<string, unknown>).dueDate).toBe("2026-07-01");
    expect((rows[1] as Record<string, unknown>).dueDate).toBe("2026-08-01");
    expect((rows[2] as Record<string, unknown>).dueDate).toBe("2026-09-01");
  });

  it("rolls forward schedule due date after a row is paid", async () => {
    const hook = loadCatalogHook("Roll forward next schedule");
    const create = vi.fn<HookEntityServices["create"]>(async () => ({
      id: "ps_next",
    }));
    const parentItem = {
      id: "fi_parent_1",
      frequency: "BIWEEKLY",
      amount: 500_000,
    };
    const paidSchedule = {
      id: "ps_paid_1",
      financialItemId: parentItem.id,
      status: "PAID",
      dueDate: "2026-07-01",
    };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === parentItem.id) {
        return parentItem;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "paymentSchedule",
      event: "paymentSchedule.afterUpdate",
      current: paidSchedule,
      previous: { ...paidSchedule, status: "UPCOMING" },
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          createMany: vi.fn(async () => []),
          update: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(async () => []),
          get,
        },
      },
    };

    await runDataHook(
      toDataHookDefinition(hook, "schedule_roll_forward_test"),
      context,
    );

    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(row?.dueDate).toBe("2026-07-15");
  });

  it("skips roll forward when next dueDate schedule already exists", async () => {
    const hook = loadCatalogHook("Roll forward next schedule");
    const create = vi.fn<HookEntityServices["create"]>(async () => ({
      id: "ps_next",
    }));
    const parentItem = {
      id: "fi_parent_1",
      frequency: "BIWEEKLY",
      amount: 500_000,
    };
    const paidSchedule = {
      id: "ps_paid_1",
      financialItemId: parentItem.id,
      status: "PAID",
      dueDate: "2026-07-01",
    };
    const existingNext = {
      id: "ps_existing_next",
      tenantId: "tenant_test",
      financialItemId: parentItem.id,
      status: "UPCOMING",
      dueDate: "2026-07-15",
    };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === parentItem.id) {
        return parentItem;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });
    const list = vi.fn<HookEntityServices["list"]>(async () => [existingNext]);

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "paymentSchedule",
      event: "paymentSchedule.afterUpdate",
      current: paidSchedule,
      previous: { ...paidSchedule, status: "UPCOMING" },
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          createMany: vi.fn(async () => []),
          update: vi.fn(),
          delete: vi.fn(),
          list,
          get,
        },
      },
    };

    await runDataHook(
      toDataHookDefinition(hook, "schedule_roll_forward_skip_existing"),
      context,
    );

    expect(list).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("skips roll forward when existing next dueDate is ISO and formula yields date-only", async () => {
    const hook = loadCatalogHook("Roll forward next schedule");
    const create = vi.fn<HookEntityServices["create"]>(async () => ({
      id: "ps_next",
    }));
    const parentItem = {
      id: "fi_parent_1",
      frequency: "BIWEEKLY",
      amount: 500_000,
    };
    const paidSchedule = {
      id: "ps_paid_1",
      financialItemId: parentItem.id,
      status: "PAID",
      dueDate: "2026-07-01",
    };
    const existingNextIso = {
      id: "ps_existing_next_iso",
      tenantId: "tenant_test",
      financialItemId: parentItem.id,
      status: "UPCOMING",
      dueDate: "2026-07-15T00:00:00.000Z",
    };

    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === parentItem.id) {
        return parentItem;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });
    const list = vi.fn<HookEntityServices["list"]>(async () => [
      existingNextIso,
    ]);

    const context: HookContext = {
      tenantId: "tenant_test",
      entityName: "paymentSchedule",
      event: "paymentSchedule.afterUpdate",
      current: paidSchedule,
      previous: { ...paidSchedule, status: "UPCOMING" },
      user: { uid: "user_test" },
      formulaResolver: createRatesFormulaResolver(),
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          createMany: vi.fn(async () => []),
          update: vi.fn(),
          delete: vi.fn(),
          list,
          get,
        },
      },
    };

    await runDataHook(
      toDataHookDefinition(hook, "schedule_roll_forward_skip_iso_existing"),
      context,
    );

    expect(list).toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
