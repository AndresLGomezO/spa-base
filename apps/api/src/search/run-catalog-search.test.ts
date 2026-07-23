import {
  defineEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import {
  QueryError,
  QueryErrorCode,
  type QueryEngine,
} from "@repo/query-engine";
import { describe, expect, it, vi } from "vitest";

import {
  formatCatalogRecordLabel,
  perEntitySearchLimit,
  runCatalogSearch,
  scoreCatalogSearchHit,
  selectSearchableCatalogEntities,
  type CatalogSearchHit,
} from "./run-catalog-search.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const EmailEntity = defineEntity({
  name: "emailMessage",
  fields: {
    subject: { type: "string", required: true },
    description: { type: "string" },
  },
  displayField: "subject",
  ui: {
    nav: { label: "Emails" },
    views: [{ type: "table", name: "default", fields: ["subject"] }],
    forms: {
      create: { sections: [{ fields: ["subject", "description"] }] },
      edit: { sections: [{ fields: ["subject", "description"] }] },
    },
  },
}) as unknown as AnyDefinedEntity;

const TransactionEntity = defineEntity({
  name: "transaction",
  fields: {
    title: { type: "string", required: true },
    description: { type: "string" },
  },
  displayField: "title",
}) as unknown as AnyDefinedEntity;

const NumberOnlyEntity = defineEntity({
  name: "metricOnly",
  fields: {
    amount: { type: "number", required: true },
  },
}) as unknown as AnyDefinedEntity;

function createQueryEngineMock(
  responses: Record<
    string,
    readonly Record<string, unknown>[] | (() => Promise<never>)
  >,
): QueryEngine {
  return {
    find: vi.fn(async (entityName: string) => {
      const response = responses[entityName];
      if (typeof response === "function") {
        return response();
      }
      return {
        data: response ?? [],
        nextCursor: null,
      };
    }),
    findOne: vi.fn(),
  } as unknown as QueryEngine;
}

describe("run-catalog-search helpers", () => {
  it("selects only readable searchable entities", () => {
    const selected = selectSearchableCatalogEntities({
      entities: [EmailEntity, TransactionEntity, NumberOnlyEntity],
      permissions: ["emailMessage.read"],
      isSuperAdmin: false,
    });
    expect(selected.map((entity) => entity.name)).toEqual(["emailMessage"]);
  });

  it("computes fair per-entity limits", () => {
    expect(perEntitySearchLimit(40, 8)).toBe(5);
    expect(perEntitySearchLimit(40, 1)).toBe(40);
  });

  it("formats labels from display field then fallbacks", () => {
    expect(
      formatCatalogRecordLabel({ id: "1", subject: "Hello" }, "subject"),
    ).toBe("Hello");
    expect(formatCatalogRecordLabel({ id: "1", name: "Acme" })).toBe("Acme");
    expect(formatCatalogRecordLabel({ id: "rec-9" })).toBe("rec-9");
  });

  it("scores exact and prefix label matches higher", () => {
    const exact: CatalogSearchHit = {
      entityName: "emailMessage",
      entityLabel: "Emails",
      id: "1",
      label: "Uber",
      record: {},
    };
    const prefix: CatalogSearchHit = {
      ...exact,
      id: "2",
      label: "Uber Eats",
    };
    const other: CatalogSearchHit = {
      ...exact,
      id: "3",
      label: "Ride note",
    };
    expect(scoreCatalogSearchHit(exact, "uber")).toBeLessThan(
      scoreCatalogSearchHit(prefix, "uber"),
    );
    expect(scoreCatalogSearchHit(prefix, "uber")).toBeLessThan(
      scoreCatalogSearchHit(other, "uber"),
    );
  });
});

describe("runCatalogSearch", () => {
  it("fans out to readable entities and merges with global limit", async () => {
    const queryEngine = createQueryEngineMock({
      emailMessage: [
        { id: "e1", subject: "Uber receipt", description: "Ride" },
        { id: "e2", subject: "Other", description: "uber tip" },
      ],
      transaction: [
        { id: "t1", title: "Uber trip", description: "Transport" },
        { id: "t2", title: "Coffee", description: "Cafe" },
      ],
    });

    const items = await runCatalogSearch({
      query: "uber",
      limit: 3,
      entities: [EmailEntity, TransactionEntity, NumberOnlyEntity],
      queryEngine,
      context: {
        userId: "u1",
        tenantId: "tenant_a",
        permissions: ["emailMessage.read", "transaction.read"],
      },
    });

    expect(queryEngine.find).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(3);
    expect(new Set(items.map((item) => item.entityName))).toEqual(
      new Set(["emailMessage", "transaction"]),
    );
    expect(items.every((item) => typeof item.label === "string")).toBe(true);
  });

  it("skips SEARCH_NOT_CONFIGURED entities without failing", async () => {
    const queryEngine = createQueryEngineMock({
      emailMessage: () =>
        Promise.reject(
          new QueryError(
            QueryErrorCode.SEARCH_NOT_CONFIGURED,
            "not configured",
          ),
        ),
      transaction: [{ id: "t1", title: "Uber trip" }],
    });

    const items = await runCatalogSearch({
      query: "uber",
      entities: [EmailEntity, TransactionEntity],
      queryEngine,
      context: {
        userId: "u1",
        tenantId: "tenant_a",
        permissions: ["emailMessage.read", "transaction.read"],
      },
    });

    expect(items).toEqual([
      expect.objectContaining({
        entityName: "transaction",
        id: "t1",
        label: "Uber trip",
        entityLabel: "Transaction",
      }),
    ]);
  });

  it("enriches records before building hits so file URLs are available", async () => {
    const queryEngine = createQueryEngineMock({
      emailMessage: [
        {
          id: "e1",
          subject: "Uber receipt",
          logo: { fileName: "logo.png", storagePath: "path/logo.png" },
        },
      ],
    });

    const enrichRecords = vi.fn(
      async (
        _entityName: string,
        records: readonly Record<string, unknown>[],
      ) =>
        records.map((record) => ({
          ...record,
          logo: {
            ...(record.logo as Record<string, unknown>),
            downloadUrl: "https://cdn.example/logo.png",
          },
        })),
    );

    const items = await runCatalogSearch({
      query: "uber",
      entities: [EmailEntity],
      queryEngine,
      context: {
        userId: "u1",
        tenantId: "tenant_a",
        permissions: ["emailMessage.read"],
      },
      enrichRecords,
    });

    expect(enrichRecords).toHaveBeenCalledWith(
      "emailMessage",
      expect.arrayContaining([expect.objectContaining({ id: "e1" })]),
    );
    expect(items[0]?.record.logo).toEqual(
      expect.objectContaining({
        downloadUrl: "https://cdn.example/logo.png",
      }),
    );
  });

  it("returns empty for blank query", async () => {
    const queryEngine = createQueryEngineMock({});
    const items = await runCatalogSearch({
      query: "   ",
      entities: [EmailEntity],
      queryEngine,
      context: {
        userId: "u1",
        tenantId: "tenant_a",
        permissions: ["emailMessage.read"],
      },
    });
    expect(items).toEqual([]);
    expect(queryEngine.find).not.toHaveBeenCalled();
  });
});
