import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { describe, expect, it } from "vitest";

import {
  COMPOSITION_SCOPES,
  resolveRootNodeKind,
} from "../types/composition.js";
import {
  createPreviewContextConfig,
  resolvePreviewContextControls,
} from "../types/preview-context.js";
import {
  FULL_DEVICE_STRATEGY,
  WIDGET_WIDTH_STRATEGY,
  resolvePreviewStrategyFromScope,
} from "../types/preview-strategy-map.js";
import { resolveCompositionScope } from "../types/composition-scope.js";
import {
  filterLayoutStyleRules,
  filterVisualStyleRules,
  isLayoutStyleProperty,
} from "../types/layout-props.js";
import {
  createDefaultLayoutDocument,
  ensureStandardRoot,
} from "../layout/ensure-standard-root.js";
import { isScreenRootNode } from "../types/layout.js";

describe("composition scope", () => {
  it("maps design surfaces to scopes", () => {
    expect(resolveCompositionScope("mainPage")).toBe("screen");
    expect(resolveCompositionScope("listItem")).toBe("block");
    expect(resolveCompositionScope("metricWidget")).toBe("component");
    expect(resolveCompositionScope("formWizardStep")).toBe("section");
  });

  it("resolves root node kind from scope", () => {
    expect(resolveRootNodeKind("screen")).toBe("screen-root");
    expect(resolveRootNodeKind("block")).toBe("container");
  });
});

describe("preview context", () => {
  it("enables device switcher only for device strategy", () => {
    expect(
      resolvePreviewContextControls(FULL_DEVICE_STRATEGY).deviceSwitcher,
    ).toBe(true);
    expect(
      resolvePreviewContextControls(FULL_DEVICE_STRATEGY).widthSlider,
    ).toBe(false);

    for (const scope of COMPOSITION_SCOPES) {
      if (scope === "screen") continue;
      const controls = resolvePreviewContextControls(
        resolvePreviewStrategyFromScope(scope),
      );
      expect(controls.deviceSwitcher).toBe(false);
      expect(controls.widthSlider).toBe(true);
    }
  });

  it("creates full preview context config with strategy", () => {
    const config = createPreviewContextConfig("component");
    expect(config.scope).toBe("component");
    expect(config.strategy).toEqual(WIDGET_WIDTH_STRATEGY);
    expect(config.controls.widthSlider).toBe(true);
  });
});

describe("layout props", () => {
  it("separates layout from visual style rules", () => {
    const rules = [
      { property: "color" as const, value: "primary" },
      { property: "justifyContent" as const, value: "center" },
    ];

    expect(isLayoutStyleProperty("justifyContent")).toBe(true);
    expect(isLayoutStyleProperty("color")).toBe(false);
    expect(filterLayoutStyleRules(rules)).toHaveLength(1);
    expect(filterVisualStyleRules(rules)).toHaveLength(1);
  });
});

describe("ensureStandardRoot", () => {
  it("wraps component scope layouts in container root", () => {
    const doc = createDefaultLayoutDocument("component");
    const normalized = ensureStandardRoot("component", doc);
    expect(resolveLayoutRootColumns(normalized)).toHaveLength(1);
    expect(resolveLayoutRootColumns(normalized)[0]?.rows[0]?.type).toBe(
      "component",
    );
  });

  it("creates screen scope with screen-root", () => {
    const doc = createDefaultLayoutDocument("screen");
    expect(isScreenRootNode(doc.root)).toBe(true);
  });
});
