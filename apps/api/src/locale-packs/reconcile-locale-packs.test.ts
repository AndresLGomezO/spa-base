import { describe, expect, it } from "vitest";

import { createInMemoryLocalePackRepository } from "@repo/firestore-converters";

import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { createLocalePackRuntimeContext } from "./locale-pack-runtime-context.js";
import { reconcileLocalePacks } from "./reconcile-locale-packs.js";

function listRepo(items: readonly unknown[]) {
  return {
    async list() {
      return items;
    },
  };
}

function getRepo(value: unknown | null = null) {
  return {
    async get() {
      return value;
    },
  };
}

describe("reconcileLocalePacks", () => {
  it("harvests live catalog strings and syncs default + mirror packs", async () => {
    const tenantId = "tenant_a";
    const tenantRepository = createInMemoryTenantRepository();
    await tenantRepository.update(tenantId, { defaultLocale: "en" });

    const localePackRepository = createInMemoryLocalePackRepository();
    await localePackRepository.create(tenantId, {
      locale: "es",
      messages: {
        "entity.account.label": "Cuentas",
        "stale.key": "Gone",
      },
    });

    const runtime = createLocalePackRuntimeContext({
      repository: localePackRepository,
      tenantRepository,
      harvestRepositories: {
        entityDefinition: listRepo([
          {
            name: "account",
            label: "Accounts",
            description: "Bank accounts",
            fields: [],
          },
        ]),
        entityCategory: listRepo([{ id: "finance", name: "Finance" }]),
        metricDefinition: listRepo([]),
        chartDefinition: listRepo([]),
        customView: listRepo([]),
        entityQueryDefinition: listRepo([]),
        entityUiOverride: listRepo([]),
        tenantSidebarLayout: getRepo(null),
        tenantDashboardLayout: getRepo(null),
      },
    });

    const result = await reconcileLocalePacks(runtime, tenantId, {
      ensureLocales: ["es"],
    });

    expect(result.harvestedKeyCount).toBeGreaterThan(0);
    expect(result.items.map((item) => item.locale).sort()).toEqual([
      "en",
      "es",
    ]);

    const en = result.items.find((item) => item.locale === "en");
    const es = result.items.find((item) => item.locale === "es");
    expect(en?.messages["entity.account.label"]).toBe("Accounts");
    expect(en?.messages["entityCategory.finance.name"]).toBe("Finance");
    expect(es?.messages["entity.account.label"]).toBe("Cuentas");
    expect(es?.messages["stale.key"]).toBeUndefined();
    expect(result.perLocale.es?.toRemove).toContain("stale.key");
  });
});
