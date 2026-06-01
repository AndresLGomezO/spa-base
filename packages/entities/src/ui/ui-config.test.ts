import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { getDefaultEntityUI } from "./default-ui-config.js";
import { serializeEntityDefinition } from "./serialize-entity-definition.js";
import { validateEntityUIConfig } from "./validate-ui-config.js";

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
    fields: {
      name: { label: "Name", component: "input" },
    },
  },
});

describe("validateEntityUIConfig", () => {
  it("accepts valid UI metadata", () => {
    expect(() =>
      validateEntityUIConfig(
        Widget as unknown as AnyDefinedEntity,
        Widget.metadata.ui!,
      ),
    ).not.toThrow();
  });

  it("rejects unknown view fields", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        views: [
          {
            type: "table",
            name: "default",
            fields: ["missingField"],
          },
        ],
      }),
    ).toThrow(/Invalid view "default" field "missingField"/);
  });

  it("rejects unknown field UI config keys", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          unknown: { label: "Bad" },
        },
      }),
    ).toThrow(/unknown field "unknown"/);
  });

  it("accepts display and date display format metadata", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          email: {
            displayFormat: "currency",
            dateDisplayFormat: "datetime",
          },
        },
      }),
    ).not.toThrow();
  });

  it("accepts field order metadata", () => {
    expect(() =>
      validateEntityUIConfig(Widget as unknown as AnyDefinedEntity, {
        ...Widget.metadata.ui!,
        fields: {
          name: { order: 0 },
          email: { order: 1 },
        },
      }),
    ).not.toThrow();
  });

  it("accepts image and document field components", () => {
    const entity = defineEntity({
      name: "brand",
      fields: {
        name: { type: "string", required: true },
        logo: { type: "image" },
        brochure: { type: "document" },
      },
    });

    expect(() =>
      validateEntityUIConfig(entity as unknown as AnyDefinedEntity, {
        ...getDefaultEntityUI(entity as unknown as AnyDefinedEntity),
        fields: {
          logo: { component: "image" },
          brochure: { component: "document" },
        },
      }),
    ).not.toThrow();
  });
});

describe("serializeEntityDefinition", () => {
  it("includes file field metadata in catalog payload", () => {
    const defaultImage = {
      storagePath: "tenants/t1/entity-files/brand/field-default-logo.png",
      contentType: "image/png",
      fileName: "logo.png",
    };
    const entity = defineEntity({
      name: "brand",
      fields: {
        name: { type: "string", required: true },
        logo: {
          type: "image",
          maxSizeBytes: 2_097_152,
          defaultImage,
        },
      },
    });

    const serialized = serializeEntityDefinition(
      entity as unknown as AnyDefinedEntity,
    );

    expect(serialized.fields.logo).toMatchObject({
      type: "image",
      maxSizeBytes: 2_097_152,
      defaultImage,
    });
  });
});

describe("getDefaultEntityUI", () => {
  it("generates table and form layouts when ui is omitted", () => {
    const entity = defineEntity({
      name: "note",
      fields: {
        title: { type: "string", required: true },
        body: { type: "string" },
      },
    });

    const ui = getDefaultEntityUI(entity as unknown as AnyDefinedEntity);
    expect(ui.views[0]?.type).toBe("table");
    expect(ui.views[0]?.fields).toEqual(["title", "body"]);
    expect(ui.forms.create.sections[0]?.fields).toEqual(["title", "body"]);
  });
});
