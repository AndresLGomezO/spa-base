import type {
  TenantSidebarLayoutSettings,
  UiLayoutDocument,
} from "@repo/entities";
import { ensureAppShellScreenRoot } from "@repo/ui-builder-core";

import type { UseTenantSidebarLayoutEditorResult } from "../ui-builder/use-tenant-sidebar-layout-editor";

export interface SidebarLayoutDesignerSnapshot {
  readonly sidebarLayout: UiLayoutDocument;
  readonly headerLayout: UiLayoutDocument;
  readonly footerLayout: UiLayoutDocument;
  readonly settings: TenantSidebarLayoutSettings;
}

export function readSidebarLayoutSnapshot(
  editor: Pick<
    UseTenantSidebarLayoutEditorResult,
    "sidebarLayout" | "headerLayout" | "footerLayout" | "settings"
  >,
): SidebarLayoutDesignerSnapshot {
  return {
    sidebarLayout: structuredClone(
      ensureAppShellScreenRoot(editor.sidebarLayout),
    ),
    headerLayout: structuredClone(
      ensureAppShellScreenRoot(editor.headerLayout),
    ),
    footerLayout: structuredClone(
      ensureAppShellScreenRoot(editor.footerLayout),
    ),
    settings: structuredClone(editor.settings),
  };
}

export function areSidebarLayoutSnapshotsEqual(
  left: SidebarLayoutDesignerSnapshot,
  right: SidebarLayoutDesignerSnapshot,
): boolean {
  return (
    JSON.stringify({
      sidebarLayout: left.sidebarLayout,
      headerLayout: left.headerLayout,
      footerLayout: left.footerLayout,
      settings: left.settings,
    }) ===
    JSON.stringify({
      sidebarLayout: right.sidebarLayout,
      headerLayout: right.headerLayout,
      footerLayout: right.footerLayout,
      settings: right.settings,
    })
  );
}

export function applySidebarLayoutSnapshotToEditor(
  editor: Pick<
    UseTenantSidebarLayoutEditorResult,
    "setSidebarLayout" | "setHeaderLayout" | "setFooterLayout" | "setSettings"
  >,
  snapshot: SidebarLayoutDesignerSnapshot,
): void {
  editor.setSidebarLayout(structuredClone(snapshot.sidebarLayout));
  editor.setHeaderLayout(structuredClone(snapshot.headerLayout));
  editor.setFooterLayout(structuredClone(snapshot.footerLayout));
  editor.setSettings(structuredClone(snapshot.settings));
}
