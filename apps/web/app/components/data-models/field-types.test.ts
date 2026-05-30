import { describe, expect, it } from "vitest";

import { createEmptyField, resolveFieldDefinitionName } from "./field-types";

describe("field-types", () => {
  it("creates fields with required enabled by default", () => {
    expect(createEmptyField("string").required).toBe(true);
    expect(createEmptyField("relation").required).toBe(true);
  });

  it("resolves relation field names from target when name is empty", () => {
    expect(
      resolveFieldDefinitionName({
        name: "",
        type: "relation",
        relation: { target: "loan", type: "many-to-one" },
      }),
    ).toBe("loanId");
  });
});
