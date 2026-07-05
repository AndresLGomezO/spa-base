import { describe, expect, it } from "vitest";

import { readGridGapEditorValue, stripGapStyleRules } from "./layout-props.js";

describe("readGridGapEditorValue", () => {
  it("prefers component.gap over style rules", () => {
    expect(
      readGridGapEditorValue(
        "32",
        [{ property: "gap", value: "20" }],
        [{ property: "gap", value: "12" }],
      ),
    ).toBe("32");
  });

  it("falls back to component and row style rules", () => {
    expect(
      readGridGapEditorValue(undefined, [{ property: "gap", value: "20" }]),
    ).toBe("20");
    expect(
      readGridGapEditorValue(undefined, undefined, [
        { property: "gap", value: "12" },
      ]),
    ).toBe("12");
  });
});

describe("stripGapStyleRules", () => {
  it("removes gap rules", () => {
    expect(
      stripGapStyleRules([
        { property: "padding", value: "8" },
        { property: "gap", value: "16" },
      ]),
    ).toEqual([{ property: "padding", value: "8" }]);
  });
});
