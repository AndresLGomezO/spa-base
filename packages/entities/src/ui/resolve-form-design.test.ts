import { createDefaultFormLayout } from "@repo/ui-builder-core";
import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "./types.js";
import {
  listFormDesignOptions,
  resolveFormConfigForDesign,
  resolvePlainFormLayout,
  resolveEntityPageCreateFormDesignId,
  resolveEntityPageEditFormDesignId,
  summarizeEntityPageFormDesignSlot,
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
        {
          id: "edit-payment",
          label: "Edit payment",
          presentation: "wizard",
          layout: createDefaultFormLayout(["amount", "note"]),
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
      { id: "edit-payment", label: "Edit payment" },
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

  it("returns undefined when the stored create design was deleted", () => {
    const definition = buildDefinition();
    expect(
      resolveEntityPageCreateFormDesignId({
        ...definition,
        ui: { ...definition.ui, entityPageCreateFormDesignId: "gone" },
      }),
    ).toBeUndefined();
  });

  it("returns undefined when create default is unset", () => {
    const definition = buildDefinition();
    const { entityPageCreateFormDesignId: _removed, ...ui } = definition.ui;
    void _removed;
    expect(
      resolveEntityPageCreateFormDesignId({ ...definition, ui }),
    ).toBeUndefined();
  });
});

describe("resolveEntityPageEditFormDesignId", () => {
  it("returns undefined when edit default is unset (only create set)", () => {
    const definition = buildDefinition();
    expect(resolveEntityPageEditFormDesignId(definition)).toBeUndefined();
  });

  it("reads edit default when set", () => {
    const definition = buildDefinition();
    expect(
      resolveEntityPageEditFormDesignId({
        ...definition,
        ui: { ...definition.ui, entityPageEditFormDesignId: "edit-payment" },
      }),
    ).toBe("edit-payment");
  });

  it("returns undefined when the stored edit design was deleted", () => {
    const definition = buildDefinition();
    expect(
      resolveEntityPageEditFormDesignId({
        ...definition,
        ui: { ...definition.ui, entityPageEditFormDesignId: "missing-edit" },
      }),
    ).toBeUndefined();
  });
});

describe("summarizeEntityPageFormDesignSlot", () => {
  it("summarizes the default slot", () => {
    const definition = buildDefinition();
    expect(summarizeEntityPageFormDesignSlot(definition, undefined)).toEqual({
      label: "Default",
      presentation: "plain",
      missing: false,
      isDefault: true,
    });
  });

  it("summarizes a named design", () => {
    const definition = buildDefinition();
    expect(
      summarizeEntityPageFormDesignSlot(definition, "edit-payment"),
    ).toEqual({
      formDesignId: "edit-payment",
      label: "Edit payment",
      presentation: "wizard",
      missing: false,
      isDefault: false,
    });
  });

  it("flags missing designs", () => {
    const definition = buildDefinition();
    expect(summarizeEntityPageFormDesignSlot(definition, "gone")).toEqual({
      formDesignId: "gone",
      label: "gone",
      presentation: "plain",
      missing: true,
      isDefault: false,
    });
  });
});
