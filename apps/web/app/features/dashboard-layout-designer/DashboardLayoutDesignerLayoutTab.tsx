import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { DashboardLayoutDesignerUnifiedPreviewPanel } from "./DashboardLayoutDesignerUnifiedPreviewPanel";
import { DashboardLayoutDesignerStructureSessionProvider } from "./DashboardLayoutDesignerStructureSession";
import { DashboardLayoutDesignerLayoutTreePanel } from "./DashboardLayoutDesignerLayoutTreePanel";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function DashboardLayoutDesignerLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useDashboardLayoutDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="dashboardLayout"
      layout={editor.dashboardLayout}
      setLayout={editor.setDashboardLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      treePanel={<DashboardLayoutDesignerLayoutTreePanel />}
      previewPanel={
        <DashboardLayoutDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <DashboardLayoutDesignerStructureSessionProvider>
          {workbench}
        </DashboardLayoutDesignerStructureSessionProvider>
      )}
    />
  );
}
