import { describe, expect, it } from "vitest";

import {
  clampCardImageSizePx,
  DEFAULT_CARD_IMAGE_SIZE_PX,
  stepCardImageSizeDown,
  stepCardImageSizeUp,
} from "./image-size.js";

describe("card image size", () => {
  it("defaults to 40px", () => {
    expect(clampCardImageSizePx(undefined)).toBe(DEFAULT_CARD_IMAGE_SIZE_PX);
  });

  it("steps size up and down equally", () => {
    expect(stepCardImageSizeUp(40)).toBe(48);
    expect(stepCardImageSizeDown(48)).toBe(40);
  });
});
