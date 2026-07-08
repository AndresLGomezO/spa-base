import { describe, expect, it } from "vitest";

import { RESPONSIVE_FONT_SIZE_CSS_VAR } from "@repo/ui-builder-core";

import { resolveLucideIconBoxStyle } from "./LayoutLucideIcon";

describe("resolveLucideIconBoxStyle", () => {
  it("prefers explicit iconSize over style fontSize", () => {
    expect(
      resolveLucideIconBoxStyle(
        { iconSize: 32 },
        { textSize: 16, cssText: ".ub-rs-x{--ub-font-size:10px}" },
      ),
    ).toEqual({ width: 32, height: 32 });
  });

  it("uses snapped/static textSize px when present", () => {
    expect(resolveLucideIconBoxStyle({}, { textSize: 10 })).toEqual({
      width: 10,
      height: 10,
    });
  });

  it("uses 1em + CSS var when responsive cssText is present without textSize", () => {
    expect(
      resolveLucideIconBoxStyle(
        {},
        { cssText: ".ub-rs-x{--ub-font-size:10px}" },
      ),
    ).toEqual({
      width: "1em",
      height: "1em",
      fontSize: `var(${RESPONSIVE_FONT_SIZE_CSS_VAR})`,
    });
  });

  it("falls back to 20 when neither size nor responsive css is available", () => {
    expect(resolveLucideIconBoxStyle({}, {})).toEqual({
      width: 20,
      height: 20,
    });
  });
});
