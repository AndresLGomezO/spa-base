import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { mapCatalogSearchItemToHit } from "./map-record-to-global-search-hit";

function definition(overrides: {
  readonly name: string;
  readonly fields?: EntityCatalogEntry["fields"];
  readonly ui?: {
    readonly nav?: { readonly label: string; readonly icon?: string };
  };
}): EntityCatalogEntry {
  return {
    collection: overrides.name,
    permissions: [],
    fields: {
      logo: { type: "image", required: false, optional: true },
      name: { type: "string", required: true, optional: false },
      description: { type: "string", required: false, optional: true },
    },
    displayField: "name",
    ui: {
      nav: { label: overrides.name, icon: "Users" },
      views: [],
      forms: { create: { sections: [] }, edit: { sections: [] } },
      ...overrides.ui,
    },
    ...overrides,
  } as EntityCatalogEntry;
}

describe("mapCatalogSearchItemToHit", () => {
  it("maps catalog search items with image and snippet", () => {
    const hit = mapCatalogSearchItemToHit({
      item: {
        entityName: "org",
        entityLabel: "Organizations",
        id: "a1",
        label: "Acme Corp",
        record: {
          id: "a1",
          name: "Acme Corp",
          description: "Retail banking partner",
          logo: {
            fileName: "logo.png",
            storagePath: "tenants/t1/org/a1/logo.png",
            downloadUrl: "https://cdn.example/logo.png",
          },
        },
      },
      definition: definition({
        name: "org",
        ui: { nav: { label: "Organizations", icon: "Users" } },
      }),
      query: "banking",
    });

    expect(hit).toEqual({
      id: "record-org-a1",
      section: "entities",
      label: "Acme Corp",
      description: "Organizations",
      snippet: "Retail banking partner",
      to: "/app/org/a1",
      entityName: "org",
      imageUrl: "https://cdn.example/logo.png",
    });
  });

  it("falls back to iconName when image is missing", () => {
    const hit = mapCatalogSearchItemToHit({
      item: {
        entityName: "product",
        entityLabel: "Products",
        id: "p1",
        label: "Widget",
        record: {
          id: "p1",
          name: "Widget",
        },
      },
      definition: definition({
        name: "product",
        fields: {
          name: { type: "string", required: true, optional: false },
        },
        ui: { nav: { label: "Products", icon: "Wallet" } },
      }),
    });

    expect(hit).toEqual({
      id: "record-product-p1",
      section: "entities",
      label: "Widget",
      description: "Products",
      to: "/app/product/p1",
      entityName: "product",
      iconName: "Wallet",
    });
  });

  it("returns null without a record id", () => {
    expect(
      mapCatalogSearchItemToHit({
        item: {
          entityName: "org",
          entityLabel: "Organizations",
          id: "  ",
          label: "No id",
          record: { name: "No id" },
        },
      }),
    ).toBeNull();
  });
});
