import { describe, expect, it } from "vitest";

import { entityFormFieldAdapter } from "./entity-form-field-adapter.js";

describe("entityFormFieldAdapter", () => {
  it("lists direct entity fields including relations", () => {
    const { fieldDescriptors, fieldOptions } = entityFormFieldAdapter({
      name: "financialProduct",
      collection: "financial_products",
      permissions: [],
      fields: {
        name: { type: "string", required: true, optional: false },
        productTypeId: {
          type: "relation",
          required: true,
          optional: false,
          relation: { type: "many-to-one", target: "productType" },
        },
      },
      ui: {
        views: [{ type: "table", name: "default", fields: ["name"] }],
        forms: {
          create: { sections: [{ fields: ["name"] }] },
          edit: { sections: [{ fields: ["name"] }] },
        },
      },
    });

    expect(fieldOptions).toContain("productTypeId");
    expect(fieldOptions).not.toContain("productType.name");
    expect(
      fieldDescriptors.some((field) => field.path === "productTypeId"),
    ).toBe(true);
  });
});
