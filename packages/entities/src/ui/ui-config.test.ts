import { describe, expect, it } from "vitest";

import { defineEntity } from "../defineEntity.js";
import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { getDefaultEntityUI } from "./default-ui-config.js";
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
