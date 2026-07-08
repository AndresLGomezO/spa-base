/**
 * Maps design surfaces and composition scopes to preview strategies (single source of truth).
 */
import type { CompositionScope } from "./composition.js";
import { resolveCompositionScope } from "./composition-scope.js";
import type { DesignSurface } from "./design-surface.js";
import type { PreviewDevice, PreviewStrategy } from "./preview-strategy.js";

export const FULL_DEVICE_SET: readonly PreviewDevice[] = [
  "mobile",
  "tablet",
  "desktop",
] as const;

export const MOBILE_DESKTOP_DEVICE_SET: readonly PreviewDevice[] = [
  "mobile",
  "desktop",
] as const;

export const FULL_DEVICE_STRATEGY: PreviewStrategy = {
  type: "device",
  devices: FULL_DEVICE_SET,
};

export const MOBILE_DESKTOP_STRATEGY: PreviewStrategy = {
  type: "device",
  devices: MOBILE_DESKTOP_DEVICE_SET,
};

/**
 * Component/widget preview: width slider with presets through XL so responsive
 * style overrides and display ranges can be verified (not capped below `md`).
 */
export const WIDGET_WIDTH_STRATEGY: PreviewStrategy = {
  type: "width",
  min: 100,
  max: 1280,
  default: 300,
  presets: [320, 640, 768, 1024, 1280],
};

export const SECTION_WIDTH_STRATEGY: PreviewStrategy = {
  type: "width",
  min: 200,
  max: 1600,
  default: 800,
  presets: [320, 640, 768, 1024, 1280, 1600],
};

export const FORM_WIDTH_STRATEGY: PreviewStrategy = {
  type: "width",
  min: 320,
  max: 900,
  default: 600,
  presets: [320, 480, 600, 768, 900],
};

const SCOPE_PREVIEW_STRATEGY_MAP: Readonly<
  Record<CompositionScope, PreviewStrategy>
> = {
  screen: FULL_DEVICE_STRATEGY,
  section: SECTION_WIDTH_STRATEGY,
  block: FORM_WIDTH_STRATEGY,
  component: WIDGET_WIDTH_STRATEGY,
};

/** Surface-specific overrides; all other surfaces fall back to scope mapping. */
const SURFACE_PREVIEW_OVERRIDES: Partial<
  Readonly<Record<DesignSurface, PreviewStrategy>>
> = {
  listItem: MOBILE_DESKTOP_STRATEGY,
  metricWidget: WIDGET_WIDTH_STRATEGY,
  mainPage: FULL_DEVICE_STRATEGY,
  dashboardLayout: FULL_DEVICE_STRATEGY,
  tableColumnCell: WIDGET_WIDTH_STRATEGY,
};

export function resolvePreviewStrategyFromScope(
  scope: CompositionScope,
): PreviewStrategy {
  return SCOPE_PREVIEW_STRATEGY_MAP[scope];
}

export function resolvePreviewStrategy(
  surface: DesignSurface,
): PreviewStrategy {
  return (
    SURFACE_PREVIEW_OVERRIDES[surface] ??
    resolvePreviewStrategyFromScope(resolveCompositionScope(surface))
  );
}
