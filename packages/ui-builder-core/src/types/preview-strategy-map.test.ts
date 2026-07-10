import { describe, expect, it } from "vitest";

import { COMPOSITION_SCOPES } from "./composition.js";
import {
  createPreviewContextConfig,
  resolvePreviewContextControls,
} from "./preview-context.js";
import {
  FORM_WIDTH_STRATEGY,
  FULL_DEVICE_STRATEGY,
  MOBILE_DESKTOP_STRATEGY,
  SECTION_WIDTH_STRATEGY,
  WIDGET_WIDTH_STRATEGY,
  resolvePreviewStrategy,
  resolvePreviewStrategyFromScope,
} from "./preview-strategy-map.js";

describe("resolvePreviewStrategy", () => {
  it("maps listItem to mobile + desktop device strategy", () => {
    const strategy = resolvePreviewStrategy("listItem");
    expect(strategy).toEqual(MOBILE_DESKTOP_STRATEGY);
    expect(strategy.type).toBe("device");
    if (strategy.type === "device") {
      expect(strategy.devices).toEqual(["mobile", "desktop"]);
    }
  });

  it("maps metricWidget to width slider strategy covering XL breakpoints", () => {
    const strategy = resolvePreviewStrategy("metricWidget");
    expect(strategy).toEqual(WIDGET_WIDTH_STRATEGY);
    expect(strategy.type).toBe("width");
    if (strategy.type === "width") {
      expect(strategy.min).toBe(100);
      expect(strategy.max).toBe(1280);
      expect(strategy.default).toBe(300);
      expect(strategy.presets).toEqual([320, 640, 768, 1024, 1280]);
    }
  });

  it("maps mainPage to full device set", () => {
    const strategy = resolvePreviewStrategy("mainPage");
    expect(strategy).toEqual(FULL_DEVICE_STRATEGY);
    if (strategy.type === "device") {
      expect(strategy.devices).toEqual(["mobile", "tablet", "desktop"]);
    }
  });

  it("maps dashboardLayout to section width slider strategy", () => {
    const strategy = resolvePreviewStrategy("dashboardLayout");
    expect(strategy).toEqual(SECTION_WIDTH_STRATEGY);
    if (strategy.type === "width") {
      expect(strategy.presets).toEqual([320, 640, 768, 1024, 1280, 1600]);
    }
  });

  it("falls back to scope mapping for surfaces without overrides", () => {
    expect(resolvePreviewStrategy("formWizardStep")).toEqual(
      SECTION_WIDTH_STRATEGY,
    );
    expect(resolvePreviewStrategy("formPlain")).toEqual(FORM_WIDTH_STRATEGY);
    expect(resolvePreviewStrategy("recordDetail")).toEqual(
      FULL_DEVICE_STRATEGY,
    );
  });
});

describe("resolvePreviewStrategyFromScope", () => {
  it.each([
    ["screen", FULL_DEVICE_STRATEGY],
    ["section", SECTION_WIDTH_STRATEGY],
    ["block", FORM_WIDTH_STRATEGY],
    ["component", WIDGET_WIDTH_STRATEGY],
  ] as const)("maps %s scope to expected strategy", (scope, expected) => {
    expect(resolvePreviewStrategyFromScope(scope)).toEqual(expected);
  });
});

describe("resolvePreviewContextControls", () => {
  it("enables device switcher for device strategy", () => {
    expect(resolvePreviewContextControls(FULL_DEVICE_STRATEGY)).toEqual({
      deviceSwitcher: true,
      widthSlider: false,
      containerFrame: false,
    });
    expect(resolvePreviewContextControls(MOBILE_DESKTOP_STRATEGY)).toEqual({
      deviceSwitcher: true,
      widthSlider: false,
      containerFrame: false,
    });
  });

  it("enables width slider for width strategy", () => {
    expect(resolvePreviewContextControls(WIDGET_WIDTH_STRATEGY)).toEqual({
      deviceSwitcher: false,
      widthSlider: true,
      containerFrame: true,
    });
    expect(resolvePreviewContextControls(SECTION_WIDTH_STRATEGY)).toEqual({
      deviceSwitcher: false,
      widthSlider: true,
      containerFrame: true,
    });
  });

  it("disables all controls for fixed strategy", () => {
    expect(resolvePreviewContextControls({ type: "fixed" })).toEqual({
      deviceSwitcher: false,
      widthSlider: false,
      containerFrame: false,
    });
  });
});

describe("createPreviewContextConfig", () => {
  it("includes strategy when surface is provided", () => {
    const config = createPreviewContextConfig("block", "listItem");
    expect(config.scope).toBe("block");
    expect(config.strategy).toEqual(MOBILE_DESKTOP_STRATEGY);
    expect(config.controls.deviceSwitcher).toBe(true);
    expect(config.controls.widthSlider).toBe(false);
  });

  it("derives strategy from scope when surface is omitted", () => {
    const config = createPreviewContextConfig("component");
    expect(config.strategy).toEqual(WIDGET_WIDTH_STRATEGY);
    expect(config.controls.widthSlider).toBe(true);
  });

  it("keeps scope-level constraints independent of strategy", () => {
    for (const scope of COMPOSITION_SCOPES) {
      const config = createPreviewContextConfig(scope);
      if (scope === "screen") {
        expect(config.constraints.width).toBe("responsive");
      } else {
        expect(config.constraints.width).toBe("fixed");
      }
    }
  });
});
