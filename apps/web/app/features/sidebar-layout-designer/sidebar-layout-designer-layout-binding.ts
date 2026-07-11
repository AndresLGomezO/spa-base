import type { UiLayoutDocument } from "@repo/entities";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseTenantSidebarLayoutEditorResult } from "../ui-builder/use-tenant-sidebar-layout-editor";
import type { AppShellDesignFocus } from "./app-shell-designer-tabs";
import type { SidebarLayoutPanelSession } from "./sidebar-layout-designer-panel-session";

type AppShellLayoutEditor = Pick<
  UseTenantSidebarLayoutEditorResult,
  | "sidebarLayout"
  | "setSidebarLayout"
  | "headerLayout"
  | "setHeaderLayout"
  | "footerLayout"
  | "setFooterLayout"
>;

export function readPanelLayoutSnapshot(
  editor: AppShellLayoutEditor,
  designFocus: AppShellDesignFocus,
): UiLayoutDocument {
  switch (designFocus) {
    case "sidebar":
      return structuredClone(editor.sidebarLayout);
    case "header":
      return structuredClone(editor.headerLayout);
    case "footer":
      return structuredClone(editor.footerLayout);
  }
}

export function applyPanelSessionSnapshot(
  editor: AppShellLayoutEditor,
  session: Pick<SidebarLayoutPanelSession, "baseline">,
  designFocus: AppShellDesignFocus,
): void {
  const snapshot = structuredClone(session.baseline);
  switch (designFocus) {
    case "sidebar":
      editor.setSidebarLayout(snapshot);
      return;
    case "header":
      editor.setHeaderLayout(snapshot);
      return;
    case "footer":
      editor.setFooterLayout(snapshot);
      return;
  }
}

export function resolveActiveLayoutBinding(
  editor: AppShellLayoutEditor,
  designFocus: AppShellDesignFocus,
): ComponentsLayoutBinding {
  switch (designFocus) {
    case "sidebar":
      return createComponentsLayoutBinding(
        editor.sidebarLayout,
        editor.setSidebarLayout,
      );
    case "header":
      return createComponentsLayoutBinding(
        editor.headerLayout,
        editor.setHeaderLayout,
      );
    case "footer":
      return createComponentsLayoutBinding(
        editor.footerLayout,
        editor.setFooterLayout,
      );
  }
}
