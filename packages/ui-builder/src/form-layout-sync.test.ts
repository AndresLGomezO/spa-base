import { describe, expect, it } from "vitest";

import { augmentFormLayoutWithFieldNames } from "./form-layout-sync.js";

describe("augmentFormLayoutWithFieldNames", () => {
  it("appends entity fields missing from the saved form layout", () => {
    const layout = augmentFormLayoutWithFieldNames(
      {
        sections: [{ fields: ["productId", "date"] }],
      },
      ["productId", "date", "statement"],
    );

    expect(layout.sections[0]?.fields).toEqual([
      "productId",
      "date",
      "statement",
    ]);
  });
});
