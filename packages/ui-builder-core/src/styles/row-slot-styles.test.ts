import { describe, expect, it } from "vitest";

import { mergeRowWrapperStyles } from "./row-slot-styles.js";
import { spacingStyleFromStyleRules } from "./apply-style-rules.js";

describe("row-slot-styles", () => {
  it("hoists component margins and overflow onto the row wrapper", () => {
    const resolved = mergeRowWrapperStyles(
      [{ property: "paddingTop", value: "8" }],
      [
        { property: "marginTop", value: "-40" },
        { property: "overflowY", value: "visible" },
        { property: "borderRadius", value: "12" },
      ],
    );

    expect(resolved.style.marginTop).toBe("-40px");
    expect(resolved.className).toContain("overflow-y-visible");
    expect(resolved.style.borderRadius).toBeUndefined();
    expect(
      spacingStyleFromStyleRules([{ property: "paddingTop", value: "8" }]),
    ).toEqual({ paddingTop: "8px" });
  });

  it("lets row hoisted styles override component hoisted styles", () => {
    const resolved = mergeRowWrapperStyles(
      [{ property: "marginTop", value: "-20" }],
      [{ property: "marginTop", value: "-40" }],
    );

    expect(resolved.style.marginTop).toBe("-20px");
  });
});
