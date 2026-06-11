import { describe, expect, it } from "vitest";

import type { SerializableEntityDefinition } from "@repo/entities";

import {
  applyFormFieldChange,
  applyRelationDisplayCache,
  FORM_DISPLAY_CACHE_KEY,
} from "./form-relation-display-cache";

const definition = {
  name: "contract",
  collection: "contracts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
    bankId: {
      type: "relation",
      required: false,
      optional: true,
      relation: { target: "bank", type: "many-to-one" },
    },
  },
  ui: {
    views: [],
    forms: { create: { sections: [] }, edit: { sections: [] } },
  },
} satisfies SerializableEntityDefinition;

describe("form-relation-display-cache", () => {
  it("stores populated relation records for display", () => {
    const next = applyFormFieldChange(
      definition,
      { name: "Loan" },
      "bankId",
      "bank_1",
      { id: "bank_1", name: "First Bank" },
    );

    expect(next.bankId).toBe("bank_1");
    expect(next[FORM_DISPLAY_CACHE_KEY]).toEqual({
      bankId: { id: "bank_1", name: "First Bank" },
    });
  });

  it("clears populated relation records when value is cleared", () => {
    const initial = applyRelationDisplayCache({ bankId: "bank_1" }, "bankId", {
      id: "bank_1",
      name: "First Bank",
    });

    const next = applyFormFieldChange(definition, initial, "bankId", "", null);

    expect(next.bankId).toBe("");
    expect(next[FORM_DISPLAY_CACHE_KEY]).toBeUndefined();
  });
});
