/**
 * Ensures layouts have a canonical root for their composition scope.
 * @see docs/UI-Builder-unification-master-plan.md
 */
import type { CompositionScope } from "../types/composition.js";
import { resolveRootNodeKind } from "../types/composition.js";
import type { UiLayoutDocument } from "../types/layout.js";
import { isScreenRootNode } from "../types/layout.js";
import { createEmptyLayout } from "../builder/mutations.js";
import { ensureContainerRoot } from "./ensure-container-root.js";
import { createDefaultMainPageLayout } from "./default-main-page-layout.js";
import {
  createScreenRootNode,
  ensureScreenRootDocument,
  migrateNestedLayoutsInDocument,
} from "./migrate-to-grid.js";

/** Full Section 15.1 migration: container stacks → grid, canonical root. */
export function migrateLayoutToSection15(
  scope: CompositionScope,
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const migrated = migrateNestedLayoutsInDocument(layout);
  return ensureStandardRoot(scope, migrated);
}

/**
 * Normalizes an existing layout to the standard root for its scope.
 */
export function ensureStandardRoot(
  scope: CompositionScope,
  layout: UiLayoutDocument,
): UiLayoutDocument {
  const migrated = migrateNestedLayoutsInDocument(layout);
  const rootKind = resolveRootNodeKind(scope);

  if (rootKind === "screen-root") {
    return ensureScreenRootDocument(migrated);
  }

  return ensureContainerRoot(migrated);
}

/**
 * Creates a new empty layout document with the canonical root for the given scope.
 */
export function createDefaultLayoutDocument(
  scope: CompositionScope,
): UiLayoutDocument {
  if (scope === "screen") {
    const mainPage = createDefaultMainPageLayout();
    return ensureScreenRootDocument(mainPage);
  }

  return ensureContainerRoot(createEmptyLayout(1));
}

export function createDefaultScreenRootLayout(): UiLayoutDocument {
  return {
    root: createScreenRootNode(),
    showActions: true,
  };
}

export function resolveDocumentRootKind(
  layout: UiLayoutDocument,
): "screen-root" | "container-root" | "legacy-root" {
  if (isScreenRootNode(layout.root)) {
    return "screen-root";
  }

  const containerRoot = ensureContainerRoot(layout);
  if (containerRoot !== layout) {
    return "legacy-root";
  }

  return "legacy-root";
}
