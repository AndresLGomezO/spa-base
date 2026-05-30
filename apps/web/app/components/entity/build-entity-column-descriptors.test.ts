import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import { buildEntityColumnDescriptors } from "./build-entity-column-descriptors";

const definition = {
  name: "widget",
  collection: "widgets",
  permissions: ["widget.read"],
  fields: {
    name: { type: "string", required: true, optional: false },
    secret: { type: "string", required: false, optional: true },
  },
  ui: {
    views: [{ type: "table", name: "default", fields: ["name", "secret"] }],
    forms: {
      create: { sections: [{ fields: ["name", "secret"] }] },
      edit: { sections: [{ fields: ["name", "secret"] }] },
    },
    fields: {
      name: { filterable: true, sortable: true },
      secret: { filterable: false, sortable: false },
    },
  },
} as SerializableEntityDefinition;

describe("buildEntityColumnDescriptors", () => {
  it("maps field ui filterable and sortable flags onto column descriptors", () => {
    const columns = buildEntityColumnDescriptors({
      definition,
      columns: ["name", "secret"],
      getOneToManyCellValue: () => null,
    });

    expect(columns[0]).toMatchObject({
      id: "name",
      filterable: true,
      sortable: true,
    });
    expect(columns[1]).toMatchObject({
      id: "secret",
      filterable: false,
      sortable: false,
    });
  });
});
