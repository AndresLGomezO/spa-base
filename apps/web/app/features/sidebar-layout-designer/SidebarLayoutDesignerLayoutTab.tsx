import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { SidebarLayoutBreakpointSettings } from "./SidebarLayoutBreakpointSettings";
import { SidebarLayoutDesignerLayoutTreePanel } from "./SidebarLayoutDesignerLayoutTreePanel";
import { SidebarLayoutDesignerStructureSessionProvider } from "./SidebarLayoutDesignerStructureSession";
import { SidebarLayoutDesignerUnifiedPreviewPanel } from "./SidebarLayoutDesignerUnifiedPreviewPanel";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function SidebarLayoutDesignerLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useSidebarLayoutDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="sidebarLayout"
      layout={editor.sidebarLayout}
      setLayout={editor.setSidebarLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      toolbarStart={<SidebarLayoutBreakpointSettings />}
      treePanel={
        <SidebarLayoutDesignerLayoutTreePanel designSurface="sidebarLayout" />
      }
      previewPanel={
        <SidebarLayoutDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <SidebarLayoutDesignerStructureSessionProvider>
          {workbench}
        </SidebarLayoutDesignerStructureSessionProvider>
      )}
    />
  );
}
