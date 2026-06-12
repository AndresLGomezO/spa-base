import type { UiLayoutDocument } from "@repo/entities";

import { areScopedLayoutSnapshotsEqual } from "../form-designer/form-designer-components-layout";
import type { UseEntityRecordDetailLayoutEditorResult } from "../ui-builder/use-entity-record-detail-layout-editor";

export interface DetailViewDesignerLayoutSnapshot {
  readonly layout: UiLayoutDocument;
}

export function readLayoutSnapshot(
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "layout">,
): DetailViewDesignerLayoutSnapshot {
  return {
    layout: structuredClone(editor.layout),
  };
}

export function readLayoutSnapshotFromDefinition(
  _definition: UseEntityRecordDetailLayoutEditorResult["definition"],
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "layout">,
): DetailViewDesignerLayoutSnapshot {
  return readLayoutSnapshot(editor);
}

export function areLayoutSnapshotsEqual(
  left: DetailViewDesignerLayoutSnapshot,
  right: DetailViewDesignerLayoutSnapshot,
): boolean {
  return areScopedLayoutSnapshotsEqual(left.layout, right.layout);
}

export function applyLayoutSnapshotToEditor(
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "setLayout">,
  snapshot: DetailViewDesignerLayoutSnapshot,
): void {
  editor.setLayout(structuredClone(snapshot.layout));
}
