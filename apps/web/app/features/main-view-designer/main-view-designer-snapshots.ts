import type { UiLayoutDocument } from "@repo/entities";

import { ensureContainerRoot } from "@repo/ui-builder-core";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import type { UseEntityMainPageLayoutEditorResult } from "../ui-builder/use-entity-main-page-layout-editor";

export interface MainViewDesignerLayoutSnapshot {
  readonly layout: UiLayoutDocument;
}

export function readLayoutSnapshot(
  editor: Pick<UseEntityMainPageLayoutEditorResult, "layout">,
): MainViewDesignerLayoutSnapshot {
  return {
    layout: structuredClone(ensureContainerRoot(editor.layout)),
  };
}

export function readLayoutSnapshotFromDefinition(
  definition: UseEntityMainPageLayoutEditorResult["definition"],
  editor: Pick<UseEntityMainPageLayoutEditorResult, "layout">,
): MainViewDesignerLayoutSnapshot {
  const existing = definition.ui.mainPageLayout;
  return {
    layout: structuredClone(ensureContainerRoot(existing ?? editor.layout)),
  };
}

export function areLayoutSnapshotsEqual(
  left: MainViewDesignerLayoutSnapshot,
  right: MainViewDesignerLayoutSnapshot,
): boolean {
  return areScopedLayoutSnapshotsEqual(left.layout, right.layout);
}

export function applyLayoutSnapshotToEditor(
  editor: Pick<UseEntityMainPageLayoutEditorResult, "setLayout">,
  snapshot: MainViewDesignerLayoutSnapshot,
): void {
  editor.setLayout(structuredClone(snapshot.layout));
}
