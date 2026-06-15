import {
  createEmptyLayout,
  ensureContainerRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

let cachedCanonicalDefault: UiLayoutDocument | null = null;

export function createDefaultDashboardLayout(): UiLayoutDocument {
  if (!cachedCanonicalDefault) {
    cachedCanonicalDefault = ensureContainerRoot(createEmptyLayout(1));
  }

  return structuredClone(cachedCanonicalDefault);
}
