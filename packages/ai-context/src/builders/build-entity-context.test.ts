import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  buildEntityCatalogFragment,
  buildEntityCurrentFragment,
  extractCatalogSummaries,
} from "./build-entity-context.js";

const sampleEntity: SerializableEntityDefinition = {
  name: "account",
  collection: "accounts",
  permissions: ["account.read"],
  description: "Customer financial accounts",
  fields: {
    name: { type: "string", required: true, optional: false },
    bankId: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "bank", type: "many-to-one" },
    },
  },
  ui: {
    nav: { label: "Accounts" },
    views: [],
    forms: { create: {}, edit: {} },
  },
};

describe("buildEntityCurrentFragment", () => {
  it("includes entity description when present", () => {
    const fragment = buildEntityCurrentFragment({
      entity: sampleEntity,
      layoutFieldPaths: ["name"],
      formFieldPaths: ["name", "bankId"],
      entityFieldSelectorPaths: [],
    });

    expect(fragment).toContain("Description: Customer financial accounts");
  });
});

describe("buildEntityCatalogFragment", () => {
  it("includes entity description in catalog lines", () => {
    const fragment = buildEntityCatalogFragment({
      tenant: {
        tenantId: "tenant_1",
        tenantName: "Acme",
        tenantStatus: "active",
      },
      entities: extractCatalogSummaries([sampleEntity], {}),
    });

    expect(fragment).toContain("description: Customer financial accounts");
  });
});

describe("extractCatalogSummaries", () => {
  it("includes description on summaries", () => {
    const summaries = extractCatalogSummaries([sampleEntity], {});
    expect(summaries[0]?.description).toBe("Customer financial accounts");
  });
});
