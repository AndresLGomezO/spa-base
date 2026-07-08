import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { validateEntityUIConfig } from "@repo/entities";

import { defineEntityFromRecord } from "./define-entity-from-record.js";
import {
  computeCatalogReplacePlan,
  computeCategoryReplacePlan,
  createEntityDefinitionEnvelope,
  createEntityDefinitionsCatalogEnvelope,
  createFieldDefinitionEnvelope,
  parseEntityDefinitionJson,
  parseEntityDefinitionsCatalogJson,
  parseFieldDefinitionJson,
  toPortableEntityCategory,
  toPortableEntityDefinition,
  validateCatalogCategoryDeleteSafety,
  validateCatalogDeleteSafety,
} from "./entity-definition-json.js";
import type { EntityDefinitionRecord } from "./types.js";

const loanRecord: EntityDefinitionRecord = {
  id: "def_loan",
  tenantId: "tenant_a",
  name: "loan",
  label: "Loans",
  version: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  fields: [{ name: "amount", type: "number", required: true }],
};

const customerRecord: EntityDefinitionRecord = {
  id: "def_customer",
  tenantId: "tenant_a",
  name: "customer",
  label: "Customers",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  fields: [{ name: "name", type: "string", required: true }],
};

describe("entity-definition-json", () => {
  it("round-trips field definition envelopes", () => {
    const envelope = createFieldDefinitionEnvelope({
      name: "amount",
      type: "number",
      required: true,
    });
    const parsed = parseFieldDefinitionJson(JSON.stringify(envelope, null, 2));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("amount");
    }
  });

  it("round-trips entity definition envelopes with navIcon", () => {
    const envelope = createEntityDefinitionEnvelope({
      name: "loan",
      label: "Loans",
      fields: [{ name: "amount", type: "number", required: true }],
      navIcon: "Wallet",
    });
    const parsed = parseEntityDefinitionJson(JSON.stringify(envelope, null, 2));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.navIcon).toBe("Wallet");
    }
  });

  it("strips server metadata for portable catalog export", () => {
    const portable = toPortableEntityDefinition(loanRecord);
    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("tenantId");
    expect(portable.name).toBe("loan");
  });

  it("validates catalog cross-references", () => {
    const envelope = createEntityDefinitionsCatalogEnvelope([loanRecord]);
    const broken = {
      ...envelope,
      entityDefinitions: [
        {
          name: "order",
          label: "Orders",
          fields: [
            {
              name: "customerId",
              type: "relation",
              relation: { target: "missing", type: "many-to-one" },
            },
          ],
        },
      ],
    };
    const parsed = parseEntityDefinitionsCatalogJson(JSON.stringify(broken));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("missing");
    }
  });

  it("computes catalog replace plan by entity name", () => {
    const imported = [
      {
        name: "loan",
        label: "Loans v2",
        fields: [{ name: "amount", type: "number" as const, required: true }],
      },
      {
        name: "payment",
        label: "Payments",
        fields: [{ name: "total", type: "number" as const, required: true }],
      },
    ];

    const plan = computeCatalogReplacePlan({
      existing: [loanRecord, customerRecord],
      imported,
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toDelete.map((item) => item.name)).toEqual(["customer"]);
    expect(plan.toCreate.map((item) => item.name)).toEqual(["payment"]);
    expect(plan.toUpdate[0]?.existing.name).toBe("loan");
  });

  it("blocks deleting entities referenced by survivors", () => {
    const orderRecord: EntityDefinitionRecord = {
      ...customerRecord,
      id: "def_order",
      name: "order",
      label: "Orders",
      fields: [
        {
          name: "customerId",
          type: "relation",
          relation: { target: "customer", type: "many-to-one" },
        },
      ],
    };

    const errors = validateCatalogDeleteSafety({
      existing: [customerRecord, orderRecord],
      toDelete: [customerRecord],
      survivingNames: new Set(["order"]),
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("customer");
  });

  it("includes categories in catalog export", () => {
    const envelope = createEntityDefinitionsCatalogEnvelope([loanRecord], {
      categories: [
        {
          id: "cat_finance",
          name: "Finance",
          icon: "Wallet",
          order: 0,
        },
      ],
    });
    expect(envelope.entityCategories).toEqual([
      { id: "cat_finance", name: "Finance", icon: "Wallet", order: 0 },
    ]);
    expect(toPortableEntityCategory(envelope.entityCategories![0]!)).toEqual(
      envelope.entityCategories![0],
    );
  });

  it("validates navCategoryId against entityCategories", () => {
    const envelope = {
      kind: "entity-definitions-catalog" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      entityCategories: [
        { id: "cat_finance", name: "Finance", icon: "Wallet", order: 0 },
      ],
      entityDefinitions: [
        {
          name: "loan",
          label: "Loans",
          navCategoryId: "cat_missing",
          fields: [{ name: "amount", type: "number" as const, required: true }],
        },
      ],
    };
    const parsed = parseEntityDefinitionsCatalogJson(JSON.stringify(envelope));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]?.message).toContain("cat_missing");
    }
  });

  it("computes category replace plan by id", () => {
    const plan = computeCategoryReplacePlan({
      existing: [
        {
          id: "cat_finance",
          name: "Finance",
          icon: "Wallet",
          order: 0,
        },
        {
          id: "cat_ops",
          name: "Operations",
          icon: "Settings",
          order: 1,
        },
      ],
      imported: [
        {
          id: "cat_finance",
          name: "Finance v2",
          icon: "Wallet",
          order: 0,
        },
        {
          id: "cat_sales",
          name: "Sales",
          icon: "TrendingUp",
          order: 2,
        },
      ],
    });

    expect(plan.counts).toEqual({ created: 1, updated: 1, deleted: 1 });
    expect(plan.toDelete.map((item) => item.id)).toEqual(["cat_ops"]);
    expect(plan.toCreate.map((item) => item.id)).toEqual(["cat_sales"]);
  });

  it("blocks deleting categories referenced by imported entities", () => {
    const errors = validateCatalogCategoryDeleteSafety({
      toDelete: [
        { id: "cat_finance", name: "Finance", icon: "Wallet", order: 0 },
      ],
      importedDefinitions: [
        {
          name: "loan",
          label: "Loans",
          navCategoryId: "cat_finance",
          fields: [{ name: "amount", type: "number" as const, required: true }],
        },
      ],
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("cat_finance");
  });

  it("parses rates entity definitions catalog", () => {
    const catalogPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../apps/api/src/admin/rates-tenant/catalogs/rates-entity-definitions.json",
    );
    const text = readFileSync(catalogPath, "utf8");
    const parsed = parseEntityDefinitionsCatalogJson(text);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error(
        parsed.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("\n"),
      );
    }

    expect(parsed.data.entityCategories).toHaveLength(5);
    expect(parsed.data.entityDefinitions).toHaveLength(14);
    expect(parsed.data.entityDefinitions.map((entity) => entity.name)).toEqual([
      "actor",
      "account",
      "category",
      "financialItem",
      "loanDetails",
      "loanMonthlyCost",
      "loanUtilization",
      "incomeDetails",
      "investmentDetails",
      "serviceDetails",
      "transaction",
      "paymentSchedule",
      "balanceSnapshot",
      "attachment",
    ]);

    for (const definition of parsed.data.entityDefinitions) {
      const record: EntityDefinitionRecord = {
        id: "preview",
        tenantId: "preview",
        name: definition.name,
        label: definition.label,
        fields: definition.fields,
        ...(definition.ui ? { ui: definition.ui } : {}),
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const entity = defineEntityFromRecord(record);
      if (definition.ui) {
        validateEntityUIConfig(entity, definition.ui);
      }
      expect(definition.ui?.nav?.label).toBe(definition.label);
      expect(definition.ui?.views?.length).toBeGreaterThan(0);
      expect(definition.ui?.forms?.create).toBeDefined();
    }

    const fieldNames = (name: string) =>
      parsed.data.entityDefinitions
        .find((entity) => entity.name === name)!
        .fields.map((field) => field.name);

    expect(fieldNames("loanDetails")).not.toContain("paymentAmount");
    expect(fieldNames("loanDetails")).toContain("originalPrincipal");
    expect(fieldNames("loanDetails")).toContain("creditLimit");
    expect(fieldNames("investmentDetails")).not.toContain("contributionAmount");
    expect(fieldNames("serviceDetails")).not.toContain("billingDay");
    expect(fieldNames("incomeDetails")).toEqual([
      "financialItemId",
      "amountBasis",
      "leaseReference",
      "annualEscalationRate",
    ]);
    expect(fieldNames("financialItem")).toContain("amount");
  });
});
