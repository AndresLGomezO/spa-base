import type { UiLayoutDocument } from "@repo/entities";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseEntityMainPageLayoutEditorResult } from "../ui-builder/use-entity-main-page-layout-editor";
import type { MainViewPanelSession } from "./main-view-designer-panel-session";

export function readLayoutSnapshot(
  editor: Pick<UseEntityMainPageLayoutEditorResult, "layout">,
): UiLayoutDocument {
  return structuredClone(editor.layout);
}

export function applyPanelSessionSnapshot(
  editor: Pick<UseEntityMainPageLayoutEditorResult, "setLayout">,
  session: Pick<MainViewPanelSession, "baseline">,
): void {
  editor.setLayout(structuredClone(session.baseline));
}

export function resolveLayoutBinding(
  editor: Pick<UseEntityMainPageLayoutEditorResult, "layout" | "setLayout">,
): ComponentsLayoutBinding {
  return createComponentsLayoutBinding(editor.layout, editor.setLayout);
}
