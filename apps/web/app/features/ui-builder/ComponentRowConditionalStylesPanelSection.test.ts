import { describe, expect, it } from "vitest";

import { componentShowsConditionalStylesSection } from "./ComponentRowConditionalStylesPanelSection.js";

describe("componentShowsConditionalStylesSection", () => {
  it("shows for containers even without entity field descriptors", () => {
    expect(
      componentShowsConditionalStylesSection({
        kind: "container",
        stackDirection: "column",
        rows: [],
      }),
    ).toBe(true);
  });

  it("shows for icons", () => {
    expect(
      componentShowsConditionalStylesSection({
        kind: "icon",
        iconName: "Home",
      }),
    ).toBe(true);
  });

  it("hides for page-header", () => {
    expect(
      componentShowsConditionalStylesSection({
        kind: "page-header",
      }),
    ).toBe(false);
  });
});
