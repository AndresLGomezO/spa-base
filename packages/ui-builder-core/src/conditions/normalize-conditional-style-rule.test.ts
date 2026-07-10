import { describe, expect, it } from "vitest";

import {
  formatConditionalRulePreview,
  normalizeConditionalStyleRule,
} from "./normalize-conditional-style-rule.js";
import { matchConditionalStyles } from "./match-conditional-styles.js";

describe("normalizeConditionalStyleRule", () => {
  it("uses explicit styles when present", () => {
    expect(
      normalizeConditionalStyleRule({
        matchValue: "ACTIVE",
        styles: [{ property: "fontSize", value: "14" }],
        textColor: "danger",
      }),
    ).toEqual({
      matchValue: "ACTIVE",
      styles: [{ property: "fontSize", value: "14" }],
    });
  });

  it("maps legacy background and textColor to style rules", () => {
    expect(
      normalizeConditionalStyleRule({
        matchValue: "high",
        background: "warning",
        textColor: "danger",
      }),
    ).toEqual({
      matchValue: "high",
      styles: [
        { property: "backgroundColor", value: "warning" },
        { property: "color", value: "danger" },
      ],
    });
  });
});

describe("formatConditionalRulePreview", () => {
  it("summarizes badge variant and style properties", () => {
    expect(
      formatConditionalRulePreview({
        matchValue: "ACTIVE",
        badgeVariant: "success",
        styles: [
          { property: "fontSize", value: "12" },
          { property: "padding", value: "8" },
        ],
      }),
    ).toBe("badge: success, fontSize: 12, padding: 8");
  });
});

describe("matchConditionalStyles with nested styles", () => {
  it("applies fontSize and padding from nested styles", () => {
    const matched = matchConditionalStyles("due", [
      {
        matchValue: "due",
        styles: [
          { property: "fontSize", value: "12" },
          { property: "paddingTop", value: "4" },
        ],
      },
    ]);

    expect(matched.style?.fontSize).toBe("12px");
    expect(matched.style?.paddingTop).toBe("4px");
  });
});
