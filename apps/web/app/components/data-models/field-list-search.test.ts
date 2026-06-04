import { describe, expect, it } from "vitest";

import {
  fieldSupportsListSearch,
  isFieldSearchableChecked,
} from "./field-list-search";

describe("field-list-search", () => {
  it("supports list search only for non-sensitive strings", () => {
    expect(fieldSupportsListSearch({ type: "string" })).toBe(true);
    expect(fieldSupportsListSearch({ type: "string", sensitive: true })).toBe(
      false,
    );
    expect(fieldSupportsListSearch({ type: "number" })).toBe(false);
  });

  it("treats string fields as searchable unless explicitly disabled", () => {
    expect(isFieldSearchableChecked({ name: "title", type: "string" })).toBe(
      true,
    );
    expect(
      isFieldSearchableChecked({
        name: "notes",
        type: "string",
        ui: { searchable: false },
      }),
    ).toBe(false);
  });
});
