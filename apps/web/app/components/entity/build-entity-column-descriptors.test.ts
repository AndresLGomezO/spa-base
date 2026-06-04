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
      name: { filterable: true, sortable: true, searchable: true },
      secret: { filterable: false, sortable: false, searchable: false },
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
      searchable: true,
    });
    expect(columns[1]).toMatchObject({
      id: "secret",
      filterable: false,
      sortable: false,
      searchable: false,
    });
  });

  it("defaults searchable to true for string fields without explicit ui flag", () => {
    const stringDefaultDefinition = {
      ...definition,
      ui: {
        ...definition.ui,
        fields: {
          name: { filterable: true, sortable: true },
          secret: { filterable: false, sortable: false },
        },
      },
    } as SerializableEntityDefinition;

    const columns = buildEntityColumnDescriptors({
      definition: stringDefaultDefinition,
      columns: ["name", "secret"],
      getOneToManyCellValue: () => null,
    });

    expect(columns[0]?.searchable).toBe(true);
    expect(columns[1]?.searchable).toBe(true);
  });

  it("defaults searchable to false for relations and sensitive fields", () => {
    const relationDefinition = {
      ...definition,
      fields: {
        ...definition.fields,
        categoryId: {
          type: "relation",
          required: false,
          optional: true,
          relation: {
            target: "category",
            type: "many-to-one",
            onDelete: "restrict",
          },
        },
      },
      ui: {
        ...definition.ui,
        views: [
          {
            type: "table",
            name: "default",
            fields: ["name", "categoryId"],
          },
        ],
        fields: {
          name: { searchable: true },
          categoryId: {},
        },
      },
    } as SerializableEntityDefinition;

    const columns = buildEntityColumnDescriptors({
      definition: relationDefinition,
      columns: ["name", "categoryId"],
      getOneToManyCellValue: () => null,
    });

    expect(columns[0]?.searchable).toBe(true);
    expect(columns[1]?.searchable).toBe(false);
  });
});
