import { describe, expect, it } from "vitest";

import {
  applyRelationSortToItems,
  isRelationSortField,
} from "./expand-relation-sort.js";
import type { EntityCatalogEntry } from "./relation-field-path.js";

type TestEntityFields = {
  readonly [key: string]: {
    readonly type: string;
    readonly required: boolean;
    readonly optional?: boolean;
    readonly relation?: { readonly type: string; readonly target: string };
  };
};

function makeDefinition(
  name: string,
  fields: TestEntityFields,
): EntityCatalogEntry {
  return {
    name,
    fields: fields as EntityCatalogEntry["fields"],
    ui: {
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      fields: {},
    },
  };
}

const contractDefinition = makeDefinition("contract", {
  name: { type: "string", required: true },
  providerId: {
    type: "relation",
    required: true,
    relation: { type: "many-to-one", target: "provider" },
  },
});

const providerDefinition = makeDefinition("provider", {
  name: { type: "string", required: true },
});

const catalog = [contractDefinition, providerDefinition];

describe("isRelationSortField", () => {
  it("detects relation dot paths", () => {
    expect(isRelationSortField("contract", catalog, "provider.name")).toBe(
      true,
    );
    expect(isRelationSortField("contract", catalog, "name")).toBe(false);
  });
});

describe("applyRelationSortToItems", () => {
  it("sorts by many-to-one relation field values", async () => {
    const items = [
      { id: "c1", providerId: "p2" },
      { id: "c2", providerId: "p1" },
    ];

    const sorted = await applyRelationSortToItems({
      sourceEntity: "contract",
      catalog,
      items,
      sort: [{ field: "provider.name", direction: "asc" }],
      listRecords: async (_entity, query) => {
        const ids = query.filter[0]?.value as string[];
        const records = [
          { id: "p1", name: "Alpha" },
          { id: "p2", name: "Beta" },
        ];
        return records.filter((record) => ids.includes(String(record.id)));
      },
    });

    expect(sorted.map((item) => item.id)).toEqual(["c2", "c1"]);
  });
});
