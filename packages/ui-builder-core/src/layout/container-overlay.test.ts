import { describe, expect, it } from "vitest";

import {
  containerHasOverlayImage,
  createContainerOverlayContext,
  resolveContainerContentLayerRowStyles,
  resolveContainerShellOverlayStyle,
  resolveImageComponentRowStyles,
} from "./container-overlay.js";
import type { ImageComponentConfig } from "../types/component.js";

describe("container-overlay", () => {
  const overlayImageRow = {
    type: "component" as const,
    id: "row-chart",
    component: {
      kind: "image" as const,
      primary: {
        type: "static" as const,
        value: "https://example.com/chart.png",
      },
      displayMode: "overlay" as const,
    },
  };

  const labelRow = {
    type: "component" as const,
    id: "row-label",
    component: {
      kind: "text" as const,
      primary: { type: "static" as const, value: "Total Balance" },
    },
  };

  it("detects overlay images in container rows", () => {
    expect(containerHasOverlayImage([overlayImageRow])).toBe(true);
    expect(containerHasOverlayImage([labelRow])).toBe(false);
  });

  it("adds overlay defaults to image row styles", () => {
    const styles = resolveImageComponentRowStyles(
      overlayImageRow.component as ImageComponentConfig,
    );

    expect(styles).toEqual(
      expect.arrayContaining([
        { property: "position", value: "absolute" },
        { property: "pointerEvents", value: "none" },
        { property: "zIndex", value: "0" },
      ]),
    );
  });

  it("injects relative positioning on container shell when overlay exists", () => {
    expect(
      resolveContainerShellOverlayStyle(undefined, [overlayImageRow]).position,
    ).toBe("relative");
  });

  it("injects content layer defaults for sibling rows", () => {
    const context = createContainerOverlayContext([overlayImageRow, labelRow]);

    expect(
      resolveContainerContentLayerRowStyles(
        undefined,
        undefined,
        context,
        labelRow,
      ),
    ).toEqual(
      expect.arrayContaining([
        { property: "position", value: "relative" },
        { property: "zIndex", value: "1" },
      ]),
    );
  });
});
