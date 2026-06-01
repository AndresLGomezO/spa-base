import { defineEntity } from "@repo/entities";
import { describe, expect, it } from "vitest";

import {
  buildFindByFieldIndex,
  buildOwnershipCreatedAtIndex,
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
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

const PublicBoard = defineEntity({
  name: "board",
  tenantWideRead: true,
  fields: {
    title: { type: "string", required: true },
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

describe("indexesForEntity", () => {
  it("skips indexes for tenantWideRead entities", () => {
    expect(indexesForEntity(PublicBoard)).toEqual([]);
  });

  it("adds baseline, ownership FK, and findByField indexes for relation entities", () => {
    const indexes = indexesForEntity(Order);
    expect(indexes).toHaveLength(3);
    expect(indexes[0]).toEqual(buildOwnershipListIndex("orders"));
    expect(indexes[1]).toEqual(buildOwnershipFkIndex("orders", "customerId"));
    expect(indexes[2]).toEqual(buildFindByFieldIndex("orders", "customerId"));
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
