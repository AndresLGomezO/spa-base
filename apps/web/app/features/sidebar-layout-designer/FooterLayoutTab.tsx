import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { FooterLayoutDesignerUnifiedPreviewPanel } from "./FooterLayoutDesignerUnifiedPreviewPanel";
import { SidebarLayoutDesignerLayoutTreePanel } from "./SidebarLayoutDesignerLayoutTreePanel";
import { SidebarLayoutDesignerStructureSessionProvider } from "./SidebarLayoutDesignerStructureSession";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function FooterLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useSidebarLayoutDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="footerLayout"
      layout={editor.footerLayout}
      setLayout={editor.setFooterLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      treePanel={
        <SidebarLayoutDesignerLayoutTreePanel designSurface="footerLayout" />
      }
      previewPanel={
        <FooterLayoutDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <SidebarLayoutDesignerStructureSessionProvider>
          {workbench}
        </SidebarLayoutDesignerStructureSessionProvider>
      )}
    />
  );
}
