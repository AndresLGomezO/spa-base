import { describe, expect, it } from "vitest";

import {
  computeAnchoredPanelPosition,
  computeSidePanelPosition,
} from "./compute-side-panel-position";

function triggerRect(left: number, top: number, width: number, height: number) {
  return {
    x: left,
    y: top,
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
  };
}

const viewport = { width: 800, height: 600 };

describe("computeSidePanelPosition", () => {
  it("top-aligns to the right of the trigger by default", () => {
    const result = computeSidePanelPosition({
      preferred: "right-start",
      triggerRect: triggerRect(12, 80, 40, 40),
      panelSize: { width: 224, height: 320 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("right-start");
    expect(result.style).toMatchObject({
      position: "fixed",
      left: 60,
      top: 80,
      maxHeight: 512,
    });
    expect(result.style.bottom).toBeUndefined();
  });

  it("bottom-aligns when the trigger is near the viewport bottom", () => {
    const result = computeSidePanelPosition({
      preferred: "right-start",
      triggerRect: triggerRect(12, 520, 40, 40),
      panelSize: { width: 224, height: 280 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("right-end");
    expect(result.style).toMatchObject({
      position: "fixed",
      left: 60,
      bottom: 40,
    });
    expect(result.style.top).toBeUndefined();
    expect(result.style.maxHeight).toBe(552);
  });

  it("flips to the left when there is no room on the right", () => {
    const result = computeSidePanelPosition({
      preferred: "right-start",
      triggerRect: triggerRect(200, 200, 48, 48),
      panelSize: { width: 288, height: 200 },
      viewport: { width: 390, height: 844 },
    });

    expect(result.resolvedPlacement).toBe("left-start");
    expect(result.style.left).toBe(8);
    expect(result.style.top).toBe(200);
  });

  it("stacks above the trigger when neither side fits horizontally", () => {
    const result = computeSidePanelPosition({
      preferred: "right-start",
      triggerRect: triggerRect(171, 700, 48, 48),
      panelSize: { width: 380, height: 120 },
      viewport: { width: 390, height: 844 },
    });

    expect(result.resolvedPlacement).toBe("top-start");
    expect(result.style.bottom).toBe(152);
    expect(result.style.left).toBe(2);
  });

  it("clamps maxHeight to remaining viewport space", () => {
    const result = computeSidePanelPosition({
      preferred: "right-start",
      triggerRect: triggerRect(12, 100, 40, 40),
      panelSize: { width: 224, height: 900 },
      viewport,
    });

    expect(result.style.maxHeight).toBe(492);
    expect(result.style.top).toBe(100);
  });

  it("honors right-end preference when more space is above", () => {
    const result = computeSidePanelPosition({
      preferred: "right-end",
      triggerRect: triggerRect(12, 500, 40, 40),
      panelSize: { width: 224, height: 200 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("right-end");
    expect(result.style.bottom).toBe(60);
    expect(result.style.top).toBeUndefined();
  });
});

describe("computeAnchoredPanelPosition", () => {
  it("flips to above when there is not enough room below", () => {
    const result = computeAnchoredPanelPosition({
      preferred: "bottom-start",
      triggerRect: triggerRect(12, 520, 240, 40),
      panelSize: { width: 288, height: 320 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("top-start");
    expect(result.style).toMatchObject({
      position: "fixed",
      left: 12,
    });
    expect(result.style.bottom).toBeDefined();
  });

  it("does not clamp height when the panel fits below the trigger", () => {
    const result = computeAnchoredPanelPosition({
      preferred: "bottom-start",
      triggerRect: triggerRect(12, 80, 240, 40),
      panelSize: { width: 420, height: 280 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("bottom-start");
    expect(result.style.top).toBe(128);
    expect(result.style.maxHeight).toBeUndefined();
  });

  it("clamps height only when the panel exceeds available space", () => {
    const result = computeAnchoredPanelPosition({
      preferred: "bottom-start",
      triggerRect: triggerRect(12, 200, 240, 40),
      panelSize: { width: 420, height: 400 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("bottom-start");
    expect(result.style.top).toBe(248);
    expect(result.style.maxHeight).toBe(344);
  });

  it("right-aligns below the trigger when horizontalAlign is end", () => {
    const result = computeAnchoredPanelPosition({
      preferred: "bottom-start",
      horizontalAlign: "end",
      triggerRect: triggerRect(720, 24, 48, 48),
      panelSize: { width: 288, height: 280 },
      viewport,
    });

    expect(result.resolvedPlacement).toBe("bottom-start");
    expect(result.style.top).toBe(80);
    expect(result.style.left).toBe(480);
  });
});
