import { describe, expect, it, vi } from "vitest";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { EntityQueryFilterNode } from "@repo/entity-queries/browser";
import { expandRelationFiltersInTree } from "@repo/entity-queries/browser";

import { resolveQueryExpansionCatalog } from "./resolve-query-expansion-catalog";

type TestEntityFields = {
  readonly [key: string]: {
    readonly type: string;
    readonly required: boolean;
    readonly relation?: { readonly type: string; readonly target: string };
  };
};

function makeDefinition(
  name: string,
  fields: TestEntityFields,
): SerializableEntityDefinition {
  return {
    name,
    collection: name,
    permissions: [],
    fields: fields as SerializableEntityDefinition["fields"],
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
  };
}

const actorDefinition = makeDefinition("actor", {
  name: { type: "string", required: true },
  type: { type: "enum", required: true },
});

const categoryDefinition = makeDefinition("category", {
  name: { type: "string", required: true },
  kind: { type: "enum", required: true },
});

const financialItemDefinition = makeDefinition("financialItem", {
  name: { type: "string", required: true },
  status: { type: "enum", required: true },
  actorId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "actor" },
  },
  categoryId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "category" },
  },
});

describe("resolveQueryExpansionCatalog", () => {
  it("fetches the hidden source entity when it is missing from the nav catalog", async () => {
    const fetchDefinition = vi.fn(async (entityName: string) => {
      if (entityName === "financialItem") {
        return financialItemDefinition;
      }
      throw new Error(`Unexpected fetch: ${entityName}`);
    });

    const catalog = await resolveQueryExpansionCatalog({
      baseCatalog: [actorDefinition, categoryDefinition],
      sourceEntity: "financialItem",
      filter: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "status",
            operator: "==",
            value: { type: "static", value: "ACTIVE" },
          },
        ],
      },
      fetchDefinition,
    });

    expect(fetchDefinition).toHaveBeenCalledWith("financialItem");
    expect(catalog.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["actor", "category", "financialItem"]),
    );
  });

  it("reuses a pre-fetched source definition without fetching again", async () => {
    const fetchDefinition = vi.fn(async () => {
      throw new Error("Should not fetch when sourceDefinition is provided");
    });

    const catalog = await resolveQueryExpansionCatalog({
      baseCatalog: [actorDefinition, categoryDefinition],
      sourceEntity: "financialItem",
      sourceDefinition: financialItemDefinition,
      fetchDefinition,
    });

    expect(fetchDefinition).not.toHaveBeenCalled();
    expect(catalog.map((entry) => entry.name)).toContain("financialItem");
  });

  it("fetches relation target entities referenced by dot-path filters", async () => {
    const fetchDefinition = vi.fn(async (entityName: string) => {
      if (entityName === "financialItem") {
        return financialItemDefinition;
      }
      throw new Error(`Unexpected fetch: ${entityName}`);
    });

    const filter: EntityQueryFilterNode = {
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "actor.type",
          operator: "==",
          value: { type: "static", value: "BANK" },
        },
      ],
    };

    const catalog = await resolveQueryExpansionCatalog({
      baseCatalog: [actorDefinition, categoryDefinition],
      sourceEntity: "financialItem",
      filter,
      fetchDefinition,
    });

    expect(fetchDefinition).toHaveBeenCalledWith("financialItem");
    expect(fetchDefinition).not.toHaveBeenCalledWith("actor");
    expect(catalog.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["category", "financialItem", "actor"]),
    );
  });

  it("allows relation filter expansion for a hidden source entity", async () => {
    const fetchDefinition = vi.fn(async (entityName: string) => {
      if (entityName === "financialItem") {
        return financialItemDefinition;
      }
      throw new Error(`Unexpected fetch: ${entityName}`);
    });

    const filter: EntityQueryFilterNode = {
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: { type: "static", value: "ACTIVE" },
        },
      ],
    };

    const catalog = await resolveQueryExpansionCatalog({
      baseCatalog: [actorDefinition, categoryDefinition],
      sourceEntity: "financialItem",
      filter,
      fetchDefinition,
    });

    const expanded = await expandRelationFiltersInTree({
      sourceEntity: "financialItem",
      catalog,
      filter,
      listChildRecords: async () => [],
    });

    expect(expanded.emptyResult).toBe(false);
    expect(expanded.filterTree).not.toBeNull();
  });
});
