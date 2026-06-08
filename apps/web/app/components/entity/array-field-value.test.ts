import { describe, expect, it } from "vitest";

import {
  appendArrayItem,
  coerceArrayValue,
  parseDraftNumber,
  parseDraftString,
  removeArrayItemAt,
} from "./array-field-value";

describe("coerceArrayValue", () => {
  it("returns empty array for non-array values", () => {
    expect(coerceArrayValue(undefined)).toEqual([]);
    expect(coerceArrayValue("tag1, tag2")).toEqual([]);
  });

  it("returns a copy of array values", () => {
    const source = ["a", "b"];
    const result = coerceArrayValue(source);
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
  });
});

describe("appendArrayItem", () => {
  it("appends string values", () => {
    expect(
      appendArrayItem([], "tag1", { dedupe: true, fieldType: "string" }),
    ).toEqual(["tag1"]);
  });

  it("dedupes strings with trim semantics", () => {
    expect(
      appendArrayItem(["tag1"], " tag1 ", {
        dedupe: true,
        fieldType: "string",
      }),
    ).toEqual(["tag1"]);
  });

  it("dedupes numbers with strict equality", () => {
    expect(
      appendArrayItem([1, 2], 2, { dedupe: true, fieldType: "number" }),
    ).toEqual([1, 2]);
  });
});

describe("removeArrayItemAt", () => {
  it("removes item at index", () => {
    expect(removeArrayItemAt(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("returns copy when index is out of range", () => {
    expect(removeArrayItemAt(["a"], 3)).toEqual(["a"]);
  });
});

describe("parseDraftString", () => {
  it("trims and rejects empty values", () => {
    expect(parseDraftString("  tag  ")).toBe("tag");
    expect(parseDraftString("   ")).toBeUndefined();
  });
});

describe("parseDraftNumber", () => {
  it("parses integers when configured", () => {
    expect(parseDraftNumber("42", { integer: true })).toBe(42);
    expect(parseDraftNumber("3.5", { integer: true })).toBeUndefined();
  });
});
