import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { HeaderLayoutBreakpointSettings } from "./HeaderLayoutBreakpointSettings";
import { HeaderLayoutDesignerUnifiedPreviewPanel } from "./HeaderLayoutDesignerUnifiedPreviewPanel";
import { SidebarLayoutDesignerLayoutTreePanel } from "./SidebarLayoutDesignerLayoutTreePanel";
import { SidebarLayoutDesignerStructureSessionProvider } from "./SidebarLayoutDesignerStructureSession";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function HeaderLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useSidebarLayoutDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="headerLayout"
      layout={editor.headerLayout}
      setLayout={editor.setHeaderLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      toolbarStart={<HeaderLayoutBreakpointSettings />}
      treePanel={
        <SidebarLayoutDesignerLayoutTreePanel designSurface="headerLayout" />
      }
      previewPanel={
        <HeaderLayoutDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <SidebarLayoutDesignerStructureSessionProvider>
          {workbench}
        </SidebarLayoutDesignerStructureSessionProvider>
      )}
    />
  );
}
