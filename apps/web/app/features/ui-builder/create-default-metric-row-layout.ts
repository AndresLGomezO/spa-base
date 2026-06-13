import {
  createDefaultUiLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import { ensureMetricsRowNestedLayoutRoot } from "./ensure-metrics-row-nested-layout-root";

let cachedCanonicalDefault: UiLayoutDocument | null = null;

/** Stable default row layout (shared IDs) for unset `metricRowLayout`. */
export function createDefaultMetricRowLayout(): UiLayoutDocument {
  if (!cachedCanonicalDefault) {
    cachedCanonicalDefault = ensureMetricsRowNestedLayoutRoot(
      createDefaultUiLayout(["name"]),
    );
  }

  return structuredClone(cachedCanonicalDefault);
}
