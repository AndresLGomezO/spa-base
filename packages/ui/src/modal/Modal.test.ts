import { describe, expect, it } from "vitest";

import {
  MODAL_PANEL_MAX_HEIGHT,
  modalContentIsScrollable,
  modalPanelViewportStyle,
} from "./Modal";

describe("modalContentIsScrollable", () => {
  it("enables scrolling only when scrollable is true", () => {
    expect(
      modalContentIsScrollable({
        scrollable: true,
      }),
    ).toBe(true);
  });

  it("keeps the modal body non-scrollable when scrollable is false", () => {
    expect(
      modalContentIsScrollable({
        scrollable: false,
      }),
    ).toBe(false);
  });
});

describe("modalPanelViewportStyle", () => {
  it("returns an empty object when sticky layout is disabled", () => {
    expect(
      modalPanelViewportStyle({
        useStickyLayout: false,
      }),
    ).toEqual({});
  });

  it("caps panel height at the viewport limit", () => {
    expect(MODAL_PANEL_MAX_HEIGHT).toBe("min(90vh, calc(100vh - 2rem))");
    expect(
      modalPanelViewportStyle({
        useStickyLayout: true,
      }),
    ).toEqual({ maxHeight: MODAL_PANEL_MAX_HEIGHT });
  });
});
