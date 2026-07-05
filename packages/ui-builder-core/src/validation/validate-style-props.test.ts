import { describe, expect, it } from "vitest";

import {
  sanitizeStyleProps,
  StylePropsValidationError,
  validateStyleProps,
} from "./validate-style-props.js";

describe("validateStyleProps", () => {
  it("rejects layout keys in style props", () => {
    expect(() =>
      validateStyleProps([{ property: "justifyContent", value: "center" }]),
    ).toThrow(StylePropsValidationError);
  });

  it("allows visual style keys", () => {
    expect(
      validateStyleProps([{ property: "color", value: "primary" }]),
    ).toHaveLength(1);
  });

  it("rejects grid placement keys in style props", () => {
    expect(() =>
      validateStyleProps([{ property: "gridColumn", value: "1 / 3" }]),
    ).toThrow(StylePropsValidationError);
  });

  it("sanitizes layout keys without throwing", () => {
    expect(
      sanitizeStyleProps([
        { property: "color", value: "primary" },
        { property: "flex", value: "1" },
      ]),
    ).toHaveLength(1);
  });
});
