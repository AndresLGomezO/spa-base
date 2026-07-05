/**
 * Preview context configuration for unified builder instances.
 * @see docs/UI-Builder-refactor-enhancement.md
 */
import type { CompositionScope } from "./composition.js";
import type { DesignSurface } from "./design-surface.js";
import type { PreviewStrategy } from "./preview-strategy.js";
import {
  resolvePreviewStrategy,
  resolvePreviewStrategyFromScope,
} from "./preview-strategy-map.js";

export type PreviewWidthConstraint = "fixed" | "fluid" | "responsive";
export type PreviewHeightConstraint = "auto" | "fixed";

export interface PreviewContextConstraints {
  readonly width: PreviewWidthConstraint;
  readonly height: PreviewHeightConstraint;
}

export interface PreviewContextControls {
  readonly deviceSwitcher: boolean;
  readonly widthSlider: boolean;
  readonly containerFrame: boolean;
}

export interface PreviewContextConfig {
  readonly scope: CompositionScope;
  readonly strategy: PreviewStrategy;
  readonly constraints: PreviewContextConstraints;
  readonly controls: PreviewContextControls;
}

/** Default preview width in pixels for component/block/section scopes. */
export const DEFAULT_PREVIEW_WIDTH_PX = 640;

export const MIN_PREVIEW_WIDTH_PX = 320;
export const MAX_PREVIEW_WIDTH_PX = 1920;

/**
 * Resolves preview control flags from preview strategy:
 * - device: device switcher ON, width slider OFF
 * - width: device switcher OFF, width slider ON
 * - fixed: all controls OFF
 */
export function resolvePreviewContextControls(
  strategy: PreviewStrategy,
): PreviewContextControls {
  switch (strategy.type) {
    case "device":
      return {
        deviceSwitcher: true,
        widthSlider: false,
        containerFrame: false,
      };
    case "width":
      return {
        deviceSwitcher: false,
        widthSlider: true,
        containerFrame: true,
      };
    case "fixed":
      return {
        deviceSwitcher: false,
        widthSlider: false,
        containerFrame: false,
      };
  }
}

export function resolvePreviewContextConstraints(
  scope: CompositionScope,
): PreviewContextConstraints {
  if (scope === "screen") {
    return { width: "responsive", height: "auto" };
  }

  return { width: "fixed", height: "auto" };
}

export function createPreviewContextConfig(
  scope: CompositionScope,
  surface?: DesignSurface,
): PreviewContextConfig {
  const strategy = surface
    ? resolvePreviewStrategy(surface)
    : resolvePreviewStrategyFromScope(scope);

  return {
    scope,
    strategy,
    constraints: resolvePreviewContextConstraints(scope),
    controls: resolvePreviewContextControls(strategy),
  };
}
