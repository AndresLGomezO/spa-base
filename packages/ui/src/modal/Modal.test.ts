import { describe, expect, it } from "vitest";

import {
  MODAL_PANEL_MAX_HEIGHT,
  buildModalResponsivePanelClassName,
  buildModalResponsiveSizeClassName,
  isModalFullscreenAtBase,
  modalContentIsScrollable,
  modalPanelViewportStyle,
} from "./Modal";

describe("isModalFullscreenAtBase", () => {
  it("is true when the base breakpoint resolves to full width", () => {
    expect(
      isModalFullscreenAtBase(
        {
          base: "2xl",
          sm: "xl",
          md: "xl",
          lg: "xl",
          xl: "xl",
        },
        "lg",
      ),
    ).toBe(true);
  });
});

describe("buildModalResponsivePanelClassName", () => {
  it("uses full-screen panel classes on mobile when base is full width", () => {
    expect(
      buildModalResponsivePanelClassName({
        base: "2xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      }),
    ).toContain("h-[100dvh]");
    expect(
      buildModalResponsivePanelClassName({
        base: "2xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      }),
    ).toContain("sm:max-w-6xl");
    expect(
      buildModalResponsivePanelClassName({
        base: "2xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      }),
    ).toContain("sm:min-h-0");
  });

  it("exits full-screen layout from sm upward when every breakpoint is full width", () => {
    const className = buildModalResponsivePanelClassName({
      base: "2xl",
      sm: "2xl",
      md: "2xl",
      lg: "2xl",
      xl: "2xl",
    });

    expect(className).toContain("h-[100dvh]");
    expect(className).toContain("sm:max-w-[96rem]");
    expect(className).toContain("sm:min-h-0");
    expect(className).not.toContain("md:max-w");
  });
});

describe("buildModalResponsiveSizeClassName", () => {
  it("emits only breakpoint prefixes where the size changes", () => {
    expect(
      buildModalResponsiveSizeClassName({
        base: "2xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      }),
    ).toBe("max-w-[96rem] sm:max-w-6xl");
  });

  it("returns a single class when every breakpoint resolves to the same size", () => {
    expect(
      buildModalResponsiveSizeClassName({
        base: "xl",
        sm: "xl",
        md: "xl",
        lg: "xl",
        xl: "xl",
      }),
    ).toBe("max-w-6xl");
  });
});

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

  it("does not cap fullscreen overlay panels to 90vh", () => {
    expect(
      modalPanelViewportStyle({
        useStickyLayout: true,
        fullscreen: true,
      }),
    ).toEqual({});
  });

  it("stretches fullscreen embedded panels to the parent height", () => {
    expect(
      modalPanelViewportStyle({
        useStickyLayout: true,
        fullscreen: true,
        embedded: true,
        panelMaxHeight: "100%",
      }),
    ).toEqual({
      height: "100%",
      minHeight: "100%",
      maxHeight: "100%",
    });
  });

  it("stretches embedded fill panels without locking height when max height is none", () => {
    expect(
      modalPanelViewportStyle({
        useStickyLayout: true,
        embedded: true,
        panelMaxHeight: "none",
      }),
    ).toEqual({
      minHeight: "100%",
    });
  });

  it("uses a custom max height when provided", () => {
    expect(
      modalPanelViewportStyle({
        useStickyLayout: true,
        panelMaxHeight: "100%",
      }),
    ).toEqual({ maxHeight: "100%" });
  });
});
