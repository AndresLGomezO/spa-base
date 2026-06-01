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
