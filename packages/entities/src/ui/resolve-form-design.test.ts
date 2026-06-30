import { createDefaultFormLayout } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "./types.js";
import {
  listFormDesignOptions,
  resolveFormConfigForDesign,
  resolvePlainFormLayout,
  resolveEntityPageCreateFormDesignId,
} from "./resolve-form-config.js";

function buildDefinition(): SerializableEntityDefinition {
  return {
    name: "payment",
    collection: "payments",
    permissions: ["payment.read"],
    fields: {
      amount: { type: "number", required: true, optional: false },
      note: { type: "string", required: false, optional: true },
    },
    ui: {
      views: [
        {
          type: "table",
          name: "default",
          fields: ["amount"],
        },
      ],
      forms: {
        create: {
          layout: createDefaultFormLayout(["amount", "note"]),
        },
        edit: {
          layout: createDefaultFormLayout(["amount", "note"]),
        },
      },
      formDesigns: [
        {
          id: "register-payment",
          label: "Register payment",
          presentation: "plain",
          layout: createDefaultFormLayout(["amount"]),
        },
      ],
      entityPageCreateFormDesignId: "register-payment",
    },
  };
}

describe("resolveFormConfigForDesign", () => {
  it("returns default forms when formDesignId is omitted", () => {
    const definition = buildDefinition();
    const layout = resolvePlainFormLayout(definition);
    expect(layout).toEqual(definition.ui.forms.create.layout);
  });

  it("returns named design layout when formDesignId matches", () => {
    const definition = buildDefinition();
    const layout = resolvePlainFormLayout(definition, "register-payment");
    expect(layout).toEqual(definition.ui.formDesigns?.[0]?.layout);
  });

  it("falls back to default forms for unknown formDesignId", () => {
    const definition = buildDefinition();
    const config = resolveFormConfigForDesign(definition, "missing");
    expect(config).toEqual(definition.ui.forms);
  });
});

describe("listFormDesignOptions", () => {
  it("includes default and named designs", () => {
    const definition = buildDefinition();
    expect(listFormDesignOptions(definition)).toEqual([
      { id: undefined, label: "Default" },
      { id: "register-payment", label: "Register payment" },
    ]);
  });
});

describe("resolveEntityPageCreateFormDesignId", () => {
  it("reads entity page default ids from ui config", () => {
    const definition = buildDefinition();
    expect(resolveEntityPageCreateFormDesignId(definition)).toBe(
      "register-payment",
    );
  });
});
