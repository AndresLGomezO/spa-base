import { defineEntity } from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  buildFindByFieldIndex,
  buildListQueryIndex,
  buildOwnershipCreatedAtIndex,
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
  computeIndexSignature,
  dedupeIndexes,
  indexesForEntity,
  indexesForEntities,
} from "./build-indexes.js";

const Customer = defineEntity({
  name: "customer",
  fields: {
    name: { type: "string", required: true },
  },
});

const Order = defineEntity({
  name: "order",
  fields: {
    customerId: {
      type: "relation",
      required: true,
      relation: { type: "many-to-one", target: "customer" },
    },
  },
});

const Task = defineEntity({
  name: "task",
  fields: {
    status: { type: "string", required: true },
    priority: { type: "number", required: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["status", "priority"] }],
    forms: {
      create: { sections: [{ fields: ["status", "priority"] }] },
      edit: { sections: [{ fields: ["status", "priority"] }] },
    },
    fields: {
      status: { filterable: true, sortable: true },
      priority: { filterable: true, sortable: false },
    },
  },
});

const PublicBoard = defineEntity({
  name: "board",
  tenantWideRead: true,
  fields: {
    title: { type: "string", required: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["title"] }],
    forms: {
      create: { sections: [{ fields: ["title"] }] },
      edit: { sections: [{ fields: ["title"] }] },
    },
    fields: {
      title: { filterable: true, sortable: true },
    },
  },
});

describe("buildOwnershipListIndex", () => {
  it("builds accessUserIds + id composite index", () => {
    expect(buildOwnershipListIndex("orders")).toEqual({
      collectionGroup: "orders",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });
});

describe("buildOwnershipFkIndex", () => {
  it("includes FK field between ownership and id", () => {
    expect(buildOwnershipFkIndex("orders", "customerId")).toEqual({
      collectionGroup: "orders",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "customerId", order: "ASCENDING" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });
});

describe("buildListQueryIndex", () => {
  it("matches hint-style ownership filter + sort", () => {
    expect(
      buildListQueryIndex("tasks", {
        filterFields: ["status"],
        sortField: "priority",
        sortDirection: "DESCENDING",
      }),
    ).toEqual({
      collectionGroup: "tasks",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "status", order: "ASCENDING" },
        { fieldPath: "priority", order: "DESCENDING" },
        { fieldPath: "id", order: "DESCENDING" },
      ],
    });
  });

  it("omits ownership for tenantWideRead", () => {
    expect(
      buildListQueryIndex("boards", {
        tenantWideRead: true,
        sortField: "title",
        sortDirection: "ASCENDING",
      }),
    ).toEqual({
      collectionGroup: "boards",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "title", order: "ASCENDING" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });
});

describe("indexesForEntity", () => {
  it("skips indexes for tenantWideRead entities", () => {
    const indexes = indexesForEntity(PublicBoard);
    expect(indexes.length).toBeGreaterThan(0);
    expect(
      indexes.every(
        (index) =>
          !index.fields.some((field) => field.fieldPath === "accessUserIds"),
      ),
    ).toBe(true);
  });

  it("adds baseline and FK indexes for relation entities", () => {
    const indexes = indexesForEntity(Order);
    expect(indexes).toContainEqual(buildOwnershipListIndex("orders"));
    expect(indexes).toContainEqual(
      buildOwnershipFkIndex("orders", "customerId"),
    );
    expect(indexes).toContainEqual(
      buildFindByFieldIndex("orders", "customerId"),
    );
  });

  it("generates curated filter-only and sort-only indexes", () => {
    const indexes = indexesForEntity(Task);
    const signatures = new Set(
      indexes.map((index) => computeIndexSignature(index)),
    );

    expect(
      signatures.has(
        computeIndexSignature(
          buildListQueryIndex("tasks", {
            filterFields: ["status"],
            sortField: "id",
            sortDirection: "ASCENDING",
          }),
        ),
      ),
    ).toBe(true);
    expect(
      signatures.has(
        computeIndexSignature(
          buildListQueryIndex("tasks", {
            sortField: "createdAt",
            sortDirection: "DESCENDING",
          }),
        ),
      ),
    ).toBe(true);
    expect(
      signatures.has(
        computeIndexSignature(
          buildListQueryIndex("tasks", {
            filterFields: ["status"],
            sortField: "priority",
            sortDirection: "ASCENDING",
          }),
        ),
      ),
    ).toBe(false);
  });

  it("uses default collection pluralization", () => {
    expect(indexesForEntity(Customer)[0]?.collectionGroup).toBe("customers");
  });
});

describe("buildOwnershipCreatedAtIndex", () => {
  it("includes createdAt and id", () => {
    expect(buildOwnershipCreatedAtIndex("orders", "DESCENDING").fields).toEqual(
      [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "createdAt", order: "DESCENDING" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    );
  });
});

describe("buildFindByFieldIndex", () => {
  it("uses fk and id without ownership", () => {
    expect(buildFindByFieldIndex("orders", "customerId")).toEqual({
      collectionGroup: "orders",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "customerId", order: "ASCENDING" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });
});

describe("dedupeIndexes", () => {
  it("removes duplicate index definitions", () => {
    const baseline = buildOwnershipListIndex("orders");
    const deduped = dedupeIndexes([
      baseline,
      baseline,
      buildOwnershipFkIndex("orders", "customerId"),
    ]);
    expect(deduped).toHaveLength(2);
  });
});

describe("indexesForEntities", () => {
  it("merges indexes across entities", () => {
    const indexes = indexesForEntities([Customer, Order]);
    expect(indexes.some((index) => index.collectionGroup === "customers")).toBe(
      true,
    );
    expect(indexes.some((index) => index.collectionGroup === "orders")).toBe(
      true,
    );
  });
});
