import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { resolveGlobalSearchHitImageUrl } from "./resolve-global-search-hit-image-url";

function definition(
  overrides: Partial<EntityCatalogEntry> & Pick<EntityCatalogEntry, "name">,
): EntityCatalogEntry {
  return {
    collection: overrides.name,
    permissions: [],
    fields: {},
    displayField: "name",
    ui: {
      nav: { label: overrides.name },
    },
    ...overrides,
  } as EntityCatalogEntry;
}

describe("resolveGlobalSearchHitImageUrl", () => {
  it("prefers logo-style image fields with a download URL", () => {
    const url = resolveGlobalSearchHitImageUrl({
      definition: definition({
        name: "org",
        fields: {
          banner: { type: "image", required: false, optional: true },
          logo: { type: "image", required: false, optional: true },
          name: { type: "string", required: true, optional: false },
        },
      }),
      record: {
        banner: {
          fileName: "banner.png",
          storagePath: "tenants/t1/org/1/banner.png",
          downloadUrl: "https://cdn.example/banner.png",
        },
        logo: {
          fileName: "logo.png",
          storagePath: "tenants/t1/org/1/logo.png",
          downloadUrl: "https://cdn.example/logo.png",
        },
      },
    });

    expect(url).toBe("https://cdn.example/logo.png");
  });

  it("falls through to the next image field when preferred is empty", () => {
    const url = resolveGlobalSearchHitImageUrl({
      definition: definition({
        name: "org",
        fields: {
          logo: { type: "image", required: false, optional: true },
          image: { type: "image", required: false, optional: true },
        },
      }),
      record: {
        logo: null,
        image: {
          fileName: "photo.png",
          storagePath: "tenants/t1/org/1/photo.png",
          downloadUrl: "https://cdn.example/photo.png",
        },
      },
    });

    expect(url).toBe("https://cdn.example/photo.png");
  });

  it("returns null when no image URL is available", () => {
    expect(
      resolveGlobalSearchHitImageUrl({
        definition: definition({
          name: "org",
          fields: {
            logo: { type: "image", required: false, optional: true },
          },
        }),
        record: { logo: null },
      }),
    ).toBeNull();
  });
});
