import type { DashboardSectionDefinition } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import { ensureContainerRoot } from "@repo/ui-builder-core";

import { createDefaultDashboardLayout } from "../ui-builder/create-default-dashboard-layout";
import type { UseTenantDashboardLayoutEditorResult } from "../ui-builder/use-tenant-dashboard-layout-editor";

export interface DashboardLayoutDesignerSectionsSnapshot {
  readonly dashboardSections: readonly DashboardSectionDefinition[];
}

export interface DashboardLayoutDesignerLayoutSnapshot {
  readonly dashboardLayout: UiLayoutDocument;
}

function normalizeSections(
  sections: readonly DashboardSectionDefinition[],
): DashboardSectionDefinition[] {
  return sections.map((section) => ({
    ...section,
    layout: ensureContainerRoot(section.layout),
  }));
}

export function readSectionsSnapshot(
  editor: Pick<UseTenantDashboardLayoutEditorResult, "dashboardSections">,
): DashboardLayoutDesignerSectionsSnapshot {
  return {
    dashboardSections: structuredClone(
      normalizeSections(editor.dashboardSections),
    ),
  };
}

export function readSectionsSnapshotFromConfig(
  config: Pick<
    UseTenantDashboardLayoutEditorResult,
    "dashboardSections"
  > | null,
): DashboardLayoutDesignerSectionsSnapshot {
  const source = config?.dashboardSections ?? [];

  return {
    dashboardSections: structuredClone(
      source.length > 0 ? normalizeSections(source) : [],
    ),
  };
}

export function areSectionsSnapshotsEqual(
  left: DashboardLayoutDesignerSectionsSnapshot,
  right: DashboardLayoutDesignerSectionsSnapshot,
): boolean {
  return (
    JSON.stringify(left.dashboardSections) ===
    JSON.stringify(right.dashboardSections)
  );
}

export function applySectionsSnapshotToEditor(
  editor: Pick<UseTenantDashboardLayoutEditorResult, "setDashboardSections">,
  snapshot: DashboardLayoutDesignerSectionsSnapshot,
): void {
  editor.setDashboardSections(structuredClone(snapshot.dashboardSections));
}

function normalizeDashboardLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return ensureContainerRoot(layout);
}

function defaultDashboardLayout(): UiLayoutDocument {
  return createDefaultDashboardLayout();
}

export function readLayoutSnapshot(
  editor: Pick<UseTenantDashboardLayoutEditorResult, "dashboardLayout">,
): DashboardLayoutDesignerLayoutSnapshot {
  return {
    dashboardLayout: structuredClone(
      normalizeDashboardLayout(editor.dashboardLayout),
    ),
  };
}

export function readLayoutSnapshotFromConfig(
  config: Pick<UseTenantDashboardLayoutEditorResult, "dashboardLayout"> | null,
): DashboardLayoutDesignerLayoutSnapshot {
  const source = config?.dashboardLayout;

  return {
    dashboardLayout: structuredClone(
      source ? normalizeDashboardLayout(source) : defaultDashboardLayout(),
    ),
  };
}

export function areLayoutSnapshotsEqual(
  left: DashboardLayoutDesignerLayoutSnapshot,
  right: DashboardLayoutDesignerLayoutSnapshot,
): boolean {
  return (
    JSON.stringify(left.dashboardLayout) ===
    JSON.stringify(right.dashboardLayout)
  );
}

export function applyLayoutSnapshotToEditor(
  editor: Pick<UseTenantDashboardLayoutEditorResult, "setDashboardLayout">,
  snapshot: DashboardLayoutDesignerLayoutSnapshot,
): void {
  editor.setDashboardLayout(structuredClone(snapshot.dashboardLayout));
}
