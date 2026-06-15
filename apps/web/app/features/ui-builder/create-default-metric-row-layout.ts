import {
  createDefaultUiLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

let cachedCanonicalDefault: UiLayoutDocument | null = null;

/** Stable default row layout (shared IDs) for unset `metricRowLayout`. */
export function createDefaultMetricRowLayout(): UiLayoutDocument {
  if (!cachedCanonicalDefault) {
    cachedCanonicalDefault = createDefaultUiLayout(["name"]);
  }

  return structuredClone(cachedCanonicalDefault);
}
