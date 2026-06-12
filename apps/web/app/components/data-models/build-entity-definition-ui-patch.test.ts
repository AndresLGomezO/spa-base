import { collectLayoutFieldPaths } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import { buildEntityDefinitionUiForSave } from "./build-entity-definition-ui-patch";

describe("buildEntityDefinitionUiForSave", () => {
  it("builds full default ui when record has no ui and icon is set", () => {
    const ui = buildEntityDefinitionUiForSave({
      record: null,
      label: "Loans",
      fields: [{ name: "title", type: "string", required: true }],
      navIcon: "Box",
    });

    expect(ui?.nav).toEqual({ label: "Loans", icon: "Box" });
    expect(ui?.views).toHaveLength(1);
  });

  it("merges icon into existing ui without dropping views", () => {
    const ui = buildEntityDefinitionUiForSave({
      record: {
        id: "def_1",
        tenantId: "tenant_a",
        name: "loan",
        label: "Loans",
        fields: [{ name: "title", type: "string", required: true }],
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ui: {
          nav: { label: "Loans", icon: "Folder" },
          views: [{ type: "table", name: "default", fields: ["title"] }],
          forms: {
            create: { sections: [{ fields: ["title"] }] },
            edit: { sections: [{ fields: ["title"] }] },
          },
        },
      },
      label: "Loans",
      fields: [{ name: "title", type: "string", required: true }],
      navIcon: "Tags",
    });

    expect(ui?.nav).toEqual({ label: "Loans", icon: "Tags" });
    expect(ui?.views).toHaveLength(1);
  });

  it("syncs newly added fields into existing form layouts", () => {
    const ui = buildEntityDefinitionUiForSave({
      record: {
        id: "def_1",
        tenantId: "tenant_a",
        name: "productSnapshot",
        label: "Product Snapshots",
        fields: [
          { name: "productId", type: "relation" },
          { name: "date", type: "date" },
        ],
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ui: {
          nav: { label: "Product Snapshots", icon: "Camera" },
          views: [
            { type: "table", name: "default", fields: ["productId", "date"] },
          ],
          forms: {
            create: { sections: [{ fields: ["productId", "date"] }] },
            edit: { sections: [{ fields: ["productId", "date"] }] },
          },
          fields: {
            productId: { component: "relation", order: 0 },
            date: { component: "date", order: 1 },
          },
        },
      },
      label: "Product Snapshots",
      fields: [
        { name: "productId", type: "relation" },
        { name: "date", type: "date" },
        { name: "statement", type: "document", ui: { label: "Statement" } },
      ],
      navIcon: "Camera",
    });

    const createLayout = ui?.forms?.create.layout;
    expect(createLayout).toBeDefined();
    expect(collectLayoutFieldPaths(createLayout!)).toEqual([
      "productId",
      "date",
      "statement",
    ]);
    expect(ui?.fields?.statement).toMatchObject({
      component: "document",
      label: "Statement",
    });
  });

  it("removes nav icon when cleared on an existing ui config", () => {
    const ui = buildEntityDefinitionUiForSave({
      record: {
        id: "def_1",
        tenantId: "tenant_a",
        name: "loan",
        label: "Loans",
        fields: [{ name: "title", type: "string", required: true }],
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ui: {
          nav: { label: "Loans", icon: "Folder" },
          views: [{ type: "table", name: "default", fields: ["title"] }],
          forms: {
            create: { sections: [{ fields: ["title"] }] },
            edit: { sections: [{ fields: ["title"] }] },
          },
        },
      },
      label: "Loans",
      fields: [{ name: "title", type: "string", required: true }],
      navIcon: "",
    });

    expect(ui?.nav).toEqual({ label: "Loans" });
    expect(ui?.nav?.icon).toBeUndefined();
  });
});
