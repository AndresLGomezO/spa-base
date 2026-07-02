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

const catalogPath = resolve(
  import.meta.dirname,
  "../../../apps/api/src/admin/rates-tenant/catalogs/rates-data-hooks.json",
);

const loanDetails = {
  id: "7f7fd68c-948e-455c-a131-b4903601c217",
  financialItemId: "e6c42ac0-9ccb-4e64-90ba-e87272d29af0",
  interestRateQuote: "EA",
  interestRate: 10.56,
  principalPortion: 716330,
  interestPortion: 2978670,
  rateType: "FIXED",
  amortizationType: "FRENCH",
  termMonths: 240,
  originalPrincipal: 361000000,
};

const financialItem = {
  id: "e6c42ac0-9ccb-4e64-90ba-e87272d29af0",
  name: "Hipoteca Altavista",
  amount: 3695000,
  currentBalance: 354603512,
  nextDueDate: "2026-07-19",
};

function loadLd01Hook() {
  const parsed = parseDataHooksCatalogJson(readFileSync(catalogPath, "utf8"));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error("Failed to parse rates data hooks catalog.");
  }

  const hook = parsed.data.dataHooks.find(
    (entry) => entry.name === "Generate loan payment plan",
  );
  expect(hook).toBeDefined();
  if (!hook) {
    throw new Error("Generate loan payment plan hook not found.");
  }

  return hook;
}

function toDataHookDefinition(
  hook: PortableDataHookDefinition,
): DataHookDefinition {
  return {
    ...hook,
    id: "ld01_test",
    tenantId: "tenant_test",
    phase: hook.phase ?? "after",
    enabled: hook.enabled ?? true,
    order: hook.order ?? 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const revolvingLoanDetails = {
  id: "8f5ddd04-18c9-4ea2-b302-cb6dc4c1e987",
  financialItemId: "f613909f-f7a8-4576-b9d8-8162253facd6",
  interestRateQuote: "NMV",
  interestRate: 2.04,
  rateType: "VARIABLE",
  amortizationType: "GERMAN",
  termMonths: 60,
  creditLimit: 17_500_000,
};

const revolvingFinancialItem = {
  id: "f613909f-f7a8-4576-b9d8-8162253facd6",
  name: "Crediservice Rotativo",
  amount: 692_487,
  currentBalance: 18_650_000,
  nextDueDate: "2026-07-16",
};

function createContext(options: {
  readonly list: HookEntityServices["list"];
  readonly loan?: typeof loanDetails | typeof revolvingLoanDetails;
  readonly parent?: typeof financialItem | typeof revolvingFinancialItem;
}): {
  readonly context: HookContext;
  readonly create: ReturnType<typeof vi.fn<HookEntityServices["create"]>>;
} {
  const create = vi.fn<HookEntityServices["create"]>(async () => ({
    id: "ps_1",
  }));
  const activeLoan = options.loan ?? loanDetails;
  const activeParent = options.parent ?? financialItem;
  const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
    if (entity === "financialItem" && id === activeParent.id) {
      return activeParent;
    }
    if (entity === "loanDetails" && id === activeLoan.id) {
      return activeLoan;
    }
    throw new Error(`Unexpected get: ${entity}/${id}`);
  });

  return {
    create,
    context: {
      tenantId: "tenant_test",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      current: activeLoan,
      user: { uid: "user_test" },
      services: {
        logger: {
          info: vi.fn(),
          error: vi.fn(),
        },
        entities: {
          create,
          update: vi.fn(),
          delete: vi.fn(),
          list: options.list,
          get,
        },
      },
    },
  };
}

describe("LD-01 runtime", () => {
  it("creates payment schedule rows for Hipoteca Altavista import shape", async () => {
    const hook = loadLd01Hook();
    const { context, create } = createContext({
      list: vi.fn(async () => []),
    });

    await runDataHook(toDataHookDefinition(hook), context);

    expect(create).toHaveBeenCalled();
    const firstRow = create.mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(firstRow?.additionalPortion).toBe(0);
  });

  it("includes active loanMonthlyCost rows in additionalPortion and expectedAmount", async () => {
    const hook = loadLd01Hook();
    const { context, create } = createContext({
      list: vi.fn(async (entity) => {
        if (entity !== "loanMonthlyCost") {
          return [];
        }
        return [
          {
            id: "cost_1",
            tenantId: "tenant_test",
            financialItemId: financialItem.id,
            name: "Life insurance",
            amount: 120_000,
            status: "ACTIVE",
          },
          {
            id: "cost_2",
            tenantId: "tenant_test",
            financialItemId: financialItem.id,
            name: "Property insurance",
            amount: 30_000,
            status: "ACTIVE",
          },
          {
            id: "cost_3",
            tenantId: "tenant_test",
            financialItemId: financialItem.id,
            name: "Inactive fee",
            amount: 999_999,
            status: "INACTIVE",
          },
        ];
      }),
    });

    await runDataHook(toDataHookDefinition(hook), context);

    const firstRow = create.mock.calls[0]?.[1] as
      | Record<string, unknown>
      | undefined;
    expect(firstRow?.additionalPortion).toBe(150_000);
    expect(firstRow?.principalPortion).toEqual(expect.any(Number));
    expect(firstRow?.interestPortion).toEqual(expect.any(Number));
    expect(firstRow?.expectedAmount).toBe(
      Number(firstRow?.principalPortion) +
        Number(firstRow?.interestPortion) +
        150_000,
    );
  });

  it("creates GERMAN Crediservice rows matching bank statement P/I (NMV)", async () => {
    const hook = loadLd01Hook();
    const { context, create } = createContext({
      list: vi.fn(async () => []),
      loan: revolvingLoanDetails,
      parent: revolvingFinancialItem,
    });

    await runDataHook(toDataHookDefinition(hook), context);

    expect(create).toHaveBeenCalled();
    const rows = create.mock.calls.map(
      (call) => call[1] as Record<string, unknown>,
    );

    expect(rows[0]?.principalPortion).toBeCloseTo(310_833, 0);
    expect(rows[0]?.interestPortion).toBeCloseTo(380_460, 0);
    expect(rows[0]?.expectedAmount).toBeCloseTo(691_293, 0);

    expect(rows[1]?.principalPortion).toBeCloseTo(305_653, 0);
    expect(rows[1]?.interestPortion).toBeCloseTo(374_120, -2);
    expect(rows[1]?.expectedAmount).toBeCloseTo(679_773, -2);

    expect(rows[2]?.expectedAmount).toBeCloseTo(668_442, 0);
    expect(Number(rows[2]?.expectedAmount)).toBeLessThan(
      Number(rows[1]?.expectedAmount),
    );

    expect(Number(rows[1]?.interestPortion)).toBeLessThan(
      Number(rows[0]?.interestPortion),
    );
    expect(Number(rows[1]?.expectedAmount)).toBeLessThan(
      Number(rows[0]?.expectedAmount),
    );
  });
});

describe("LD-01a runtime", () => {
  function loadLd01aHook() {
    const parsed = parseDataHooksCatalogJson(readFileSync(catalogPath, "utf8"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error("Failed to parse rates data hooks catalog.");
    }

    const hook = parsed.data.dataHooks.find(
      (entry) => entry.name === "Persist inferred loan origination date",
    );
    expect(hook).toBeDefined();
    if (!hook) {
      throw new Error("Persist inferred loan origination date hook not found.");
    }

    return hook;
  }

  it("skips deferred GERMAN revolving loans without principal snapshots", async () => {
    const hook = loadLd01aHook();
    const update = vi.fn<HookEntityServices["update"]>(async () => ({
      id: revolvingLoanDetails.id,
    }));
    const list = vi.fn<HookEntityServices["list"]>(async () => [
      {
        ...revolvingLoanDetails,
        tenantId: "tenant_test",
      },
    ]);
    const get = vi.fn<HookEntityServices["get"]>(async (entity, id) => {
      if (entity === "financialItem" && id === revolvingFinancialItem.id) {
        return revolvingFinancialItem;
      }
      throw new Error(`Unexpected get: ${entity}/${id}`);
    });

    await runDataHook(toDataHookDefinition(hook), {
      tenantId: "tenant_test",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      current: revolvingLoanDetails,
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
          list,
          get,
        },
      },
    });

    expect(update).not.toHaveBeenCalled();
  });
});
