import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { buildGlobalSearchRecordSnippet } from "./build-global-search-record-snippet";

function definition(
  overrides: Partial<EntityCatalogEntry> & Pick<EntityCatalogEntry, "name">,
): EntityCatalogEntry {
  return {
    collection: overrides.name,
    permissions: [],
    fields: {
      name: { type: "string", required: true, optional: false },
      description: { type: "string", required: false, optional: true },
      notes: { type: "string", required: false, optional: true },
    },
    displayField: "name",
    ui: {
      nav: { label: overrides.name },
    },
    ...overrides,
  } as EntityCatalogEntry;
}

describe("buildGlobalSearchRecordSnippet", () => {
  it("prefers query-matching secondary fields over other text", () => {
    const snippet = buildGlobalSearchRecordSnippet({
      record: {
        id: "1",
        name: "Ride",
        description: "Taxi downtown",
        notes: "Paid uber yesterday",
      },
      definition: definition({ name: "transaction" }),
      label: "Ride",
      query: "uber",
    });

    expect(snippet).toBe("Paid uber yesterday");
  });

  it("joins up to two secondary details when no query match", () => {
    const snippet = buildGlobalSearchRecordSnippet({
      record: {
        id: "1",
        name: "Acme",
        description: "Bank transfer",
        notes: "Monthly rent",
      },
      definition: definition({ name: "transaction" }),
      label: "Acme",
    });

    expect(snippet).toContain("Bank transfer");
    expect(snippet).toContain("Monthly rent");
  });

  it("returns undefined when only the display label exists", () => {
    expect(
      buildGlobalSearchRecordSnippet({
        record: { id: "1", name: "Acme" },
        definition: definition({
          name: "org",
          fields: {
            name: { type: "string", required: true, optional: false },
          },
        }),
        label: "Acme",
      }),
    ).toBeUndefined();
  });
});
