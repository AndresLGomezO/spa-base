import type { UiLayoutDocument } from "@repo/entities";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseEntityRecordDetailLayoutEditorResult } from "../ui-builder/use-entity-record-detail-layout-editor";
import type { DetailViewPanelSession } from "./detail-view-designer-panel-session";

export function readLayoutSnapshot(
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "layout">,
): UiLayoutDocument {
  return structuredClone(editor.layout);
}

export function applyPanelSessionSnapshot(
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "setLayout">,
  session: Pick<DetailViewPanelSession, "baseline">,
): void {
  editor.setLayout(structuredClone(session.baseline));
}

export function resolveLayoutBinding(
  editor: Pick<UseEntityRecordDetailLayoutEditorResult, "layout" | "setLayout">,
): ComponentsLayoutBinding {
  return createComponentsLayoutBinding(editor.layout, editor.setLayout);
}
