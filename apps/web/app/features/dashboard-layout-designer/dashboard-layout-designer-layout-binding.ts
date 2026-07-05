import type { UiLayoutDocument } from "@repo/ui-builder-core";

import {
  createComponentsLayoutBinding,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import type { UseTenantDashboardLayoutEditorResult } from "../ui-builder/use-tenant-dashboard-layout-editor";
import type { DashboardLayoutPanelSession } from "./dashboard-layout-designer-panel-session";
import type { DashboardLayoutDesignFocus } from "./dashboard-layout-designer-tabs";
import { isShellLayoutFocus } from "./dashboard-layout-designer-tabs";

function resolveSelectedSectionLayout(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    "selectedSection" | "dashboardSections"
  >,
): UiLayoutDocument | null {
  const layout = editor.selectedSection?.layout;
  if (layout) {
    return layout;
  }

  return editor.dashboardSections[0]?.layout ?? null;
}

function readSectionsLayoutSnapshot(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    "selectedSection" | "dashboardSections"
  >,
): UiLayoutDocument {
  const layout = resolveSelectedSectionLayout(editor);
  if (!layout) {
    throw new Error(
      "Dashboard layout designer requires a selected section layout.",
    );
  }

  return structuredClone(layout);
}

function readDashboardLayoutSnapshot(
  editor: Pick<UseTenantDashboardLayoutEditorResult, "dashboardLayout">,
): UiLayoutDocument {
  return structuredClone(editor.dashboardLayout);
}

export function readPanelLayoutSnapshot(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    "dashboardLayout" | "selectedSection" | "dashboardSections"
  >,
  designFocus: DashboardLayoutDesignFocus,
): UiLayoutDocument {
  if (isShellLayoutFocus(designFocus)) {
    return readDashboardLayoutSnapshot(editor);
  }

  return readSectionsLayoutSnapshot(editor);
}

export function applyPanelSessionSnapshot(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    "setDashboardLayout" | "updateSelectedSectionLayout"
  >,
  session: Pick<DashboardLayoutPanelSession, "baseline">,
  designFocus: DashboardLayoutDesignFocus,
): void {
  const snapshot = structuredClone(session.baseline);
  if (isShellLayoutFocus(designFocus)) {
    editor.setDashboardLayout(snapshot);
    return;
  }

  editor.updateSelectedSectionLayout(snapshot);
}

export function resolveSectionsLayoutBinding(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    | "selectedSection"
    | "selectedSectionId"
    | "dashboardSections"
    | "updateSelectedSectionLayout"
  >,
): ComponentsLayoutBinding {
  const layout = resolveSelectedSectionLayout(editor);
  const sectionId =
    editor.selectedSection?.id ??
    editor.dashboardSections[0]?.id ??
    editor.selectedSectionId;

  if (!layout || !sectionId) {
    throw new Error(
      "Dashboard layout designer requires a selected section layout.",
    );
  }

  return createComponentsLayoutBinding(layout, (next) => {
    editor.updateSelectedSectionLayout(next);
  });
}

export function resolveDashboardLayoutBinding(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    "dashboardLayout" | "setDashboardLayout"
  >,
): ComponentsLayoutBinding {
  return createComponentsLayoutBinding(editor.dashboardLayout, (next) => {
    editor.setDashboardLayout(next);
  });
}

export function resolveActiveLayoutBinding(
  editor: Pick<
    UseTenantDashboardLayoutEditorResult,
    | "dashboardLayout"
    | "selectedSection"
    | "selectedSectionId"
    | "setDashboardLayout"
    | "dashboardSections"
    | "updateSelectedSectionLayout"
  >,
  designFocus: DashboardLayoutDesignFocus,
): ComponentsLayoutBinding {
  if (isShellLayoutFocus(designFocus)) {
    return resolveDashboardLayoutBinding(editor);
  }

  return resolveSectionsLayoutBinding(editor);
}
