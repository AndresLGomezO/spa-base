import { describe, expect, it } from "vitest";

import {
  MOBILE_PREVIEW_DEVICE_PRESETS,
  resolveMobilePreviewChassisSize,
  resolveMobilePreviewDisplayMetrics,
} from "./mobile-preview-device-presets";

describe("mobile preview device presets", () => {
  it("uses unique device ids", () => {
    const ids = MOBILE_PREVIEW_DEVICE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves viewport aspect ratio when scaling to fit the preview panel", () => {
    const iphone17ProMax = MOBILE_PREVIEW_DEVICE_PRESETS.find(
      (preset) => preset.id === "iphone-17-pro-max",
    )!;

    expect(iphone17ProMax.width).toBe(430);
    expect(iphone17ProMax.height).toBe(932);

    const naturalAspect = iphone17ProMax.width / iphone17ProMax.height;
    const metrics = resolveMobilePreviewDisplayMetrics(iphone17ProMax, 640);

    expect(metrics.screenWidth).toBe(430);
    expect(metrics.screenHeight).toBe(932);

    const displayAspect =
      metrics.displayChassisWidth / metrics.displayChassisHeight;
    const naturalChassis = resolveMobilePreviewChassisSize(iphone17ProMax);

    expect(displayAspect).toBeCloseTo(
      naturalChassis.chassisWidth / naturalChassis.chassisHeight,
      5,
    );
    expect(metrics.displayChassisHeight).toBeLessThanOrEqual(640);
    expect(naturalAspect).toBeCloseTo(430 / 932, 5);
  });
});
