import { describe, expect, it } from "vitest";

import { listCreateFormPrefillSourceFieldDescriptors } from "./create-form-prefill-source-fields.js";

describe("listCreateFormPrefillSourceFieldDescriptors", () => {
  const definition = {
    name: "account",
    fields: {
      id: { type: "string" },
      name: { type: "string" },
      bankId: {
        type: "string",
        relation: { type: "many-to-one", target: "bank" },
      },
      status: {
        type: "enum",
        enumValues: ["active", "inactive"],
      },
      orders: {
        type: "array",
        relation: { type: "one-to-many", target: "order" },
      },
    },
    ui: { fields: {} },
  } as const;

  it("adds root id and relation fk fields to layout field descriptors", () => {
    const paths = listCreateFormPrefillSourceFieldDescriptors(
      definition as never,
      [
        {
          path: "bank.name",
          label: "Bank Name",
          valueType: "string",
        },
        {
          path: "name",
          label: "Name",
          valueType: "string",
        },
      ],
    ).map((field) => field.path);

    expect(paths).toContain("id");
    expect(paths).toContain("bankId");
    expect(paths).toContain("status");
    expect(paths).toContain("bank.name");
    expect(paths).not.toContain("orders");
  });
});
