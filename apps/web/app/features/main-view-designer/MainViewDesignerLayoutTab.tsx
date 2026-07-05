import { useMainViewDesigner } from "./main-view-designer-context";
import { MainViewDesignerLayoutTreePanel } from "./MainViewDesignerLayoutTreePanel";
import { MainViewDesignerStructureSessionProvider } from "./MainViewDesignerStructureSession";
import { MainViewDesignerUnifiedPreviewPanel } from "./MainViewDesignerUnifiedPreviewPanel";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function MainViewDesignerLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } = useMainViewDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="mainPage"
      layout={editor.layout}
      setLayout={editor.setLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      treePanel={<MainViewDesignerLayoutTreePanel />}
      previewPanel={<MainViewDesignerUnifiedPreviewPanel withStructureChrome />}
      sessionWrapper={(workbench) => (
        <MainViewDesignerStructureSessionProvider>
          {workbench}
        </MainViewDesignerStructureSessionProvider>
      )}
    />
  );
}
