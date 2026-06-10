import { describe, expect, it } from "vitest";
import { createDefaultUiLayout } from "@repo/ui-builder-core";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import {
  createDesignLayoutSliceEnvelope,
  entityUiConfigToPutOverrideInput,
  parseDesignLayoutSliceJson,
  validateDesignLayoutSlice,
} from "./design-layout-slice-schema.js";
import { getDefaultEntityUI } from "./default-ui-config.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const Widget = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "isActive"],
      },
    ],
    forms: {
      create: {
        sections: [{ fields: ["name", "email", "isActive"] }],
      },
      edit: {
        sections: [{ fields: ["name", "email", "isActive"] }],
      },
    },
  },
});

const entity = Widget as unknown as AnyDefinedEntity;
const baseUi = Widget.metadata.ui!;

describe("parseDesignLayoutSliceJson", () => {
  it("parses a valid list slice envelope", () => {
    const layout = createDefaultUiLayout(["name"]);
    const envelope = createDesignLayoutSliceEnvelope("list", {
      listViewType: "table",
      table: { fields: ["name", "email"], showActions: true },
      expandableTable: {
        columns: [{ id: "col-1", cellLayout: layout }],
        rowExpandLayout: layout,
        showActions: true,
      },
    });

    const result = parseDesignLayoutSliceJson(
      JSON.stringify(envelope),
      "list",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        listViewType: "table",
        table: { fields: ["name", "email"], showActions: true },
      });
    }
  });

  it("rejects mismatched surface", () => {
    const envelope = createDesignLayoutSliceEnvelope("mainPage", {
      mainPage: createDefaultUiLayout(["name"]),
    });

    const result = parseDesignLayoutSliceJson(
      JSON.stringify(envelope),
      "list",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects invalid JSON", () => {
    const result = parseDesignLayoutSliceJson("{bad", "list");
    expect(result.ok).toBe(false);
  });
});

describe("validateDesignLayoutSlice", () => {
  it("accepts a valid main page slice", () => {
    const data = {
      mainPage: createDefaultUiLayout(["name"]),
    };
    const result = validateDesignLayoutSlice(entity, "mainPage", data, baseUi);
    expect(result.ok).toBe(true);
  });

  it("rejects list slice with unknown fields", () => {
    const layout = createDefaultUiLayout(["name"]);
    const data = {
      listViewType: "table" as const,
      table: { fields: ["missingField"] },
      expandableTable: {
        columns: [{ id: "col-1", cellLayout: layout }],
        rowExpandLayout: layout,
      },
    };
    const result = validateDesignLayoutSlice(entity, "list", data, baseUi);
    expect(result.ok).toBe(false);
  });
});

describe("entityUiConfigToPutOverrideInput", () => {
  it("maps catalog UI config to PUT input shape", () => {
    const layout = createDefaultUiLayout(["name"]);
    const ui = {
      ...getDefaultEntityUI(entity),
      listViewType: "table" as const,
      mainPageLayout: layout,
      recordDetailLayout: layout,
      forms: {
        create: { sections: [{ fields: ["name"] }], layout },
        edit: { sections: [{ fields: ["name"] }], layout },
        presentation: "plain" as const,
        modalSize: "lg" as const,
      },
    };

    const input = entityUiConfigToPutOverrideInput(ui);
    expect(input.mainPage).toEqual(layout);
    expect(input.recordDetail).toEqual(layout);
    expect(input.listViewType).toBe("table");
    expect(input.forms?.layout).toEqual(layout);
    expect(input.forms?.presentation).toBe("plain");
    expect(input.forms?.modalSize).toBe("lg");
    expect(input.views.length).toBeGreaterThan(0);
  });
});
