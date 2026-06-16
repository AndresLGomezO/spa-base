import { describe, expect, it } from "vitest";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { collectViewAvailableFilterOptions } from "./collect-view-available-filter-options";

function createCatalogEntry(
  name: string,
  fields: Record<string, { filterable?: boolean; searchable?: boolean }>,
): EntityCatalogEntry {
  const entityFields = Object.fromEntries(
    Object.keys(fields).map((fieldName) => [fieldName, { type: "string" }]),
  );

  return {
    name,
    fields: entityFields,
    ui: {
      views: [
        {
          type: "table",
          name: "default",
          fields: Object.keys(fields),
        },
      ],
      fields,
    },
  } as unknown as EntityCatalogEntry;
}

describe("collectViewAvailableFilterOptions", () => {
  it("lists filterable fields for every entity in the data model catalog", () => {
    const options = collectViewAvailableFilterOptions([
      createCatalogEntry("account", {
        accountType: { filterable: true },
        name: { searchable: true, filterable: false },
      }),
      createCatalogEntry("contact", {
        status: { filterable: true },
      }),
    ]);

    expect(options).toEqual([
      expect.objectContaining({
        entityName: "account",
        fieldName: "accountType",
      }),
      expect.objectContaining({
        entityName: "contact",
        fieldName: "status",
      }),
    ]);
  });
});
