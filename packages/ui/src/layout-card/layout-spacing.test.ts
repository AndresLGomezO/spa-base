import { describe, expect, it } from "vitest";

import { getLayoutSpacingStyle } from "./layout-spacing.js";

describe("getLayoutSpacingStyle", () => {
  it("maps axis margins to both sides", () => {
    expect(getLayoutSpacingStyle({ marginX: 8, marginY: 4 })).toEqual({
      marginLeft: "8px",
      marginRight: "8px",
      marginTop: "4px",
      marginBottom: "4px",
    });
  });

  it("lets side-specific margins override axis margins", () => {
    expect(
      getLayoutSpacingStyle({
        marginX: 8,
        marginY: 4,
        marginTop: 12,
        marginLeft: 16,
      }),
    ).toEqual({
      marginTop: "12px",
      marginBottom: "4px",
      marginLeft: "16px",
      marginRight: "8px",
    });
  });

  it("maps padding", () => {
    expect(getLayoutSpacingStyle({ padding: 6 })).toEqual({
      padding: "6px",
    });
  });
});
