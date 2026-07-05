import { useDetailViewDesigner } from "./detail-view-designer-context";
import { DetailViewDesignerLayoutTreePanel } from "./DetailViewDesignerLayoutTreePanel";
import { DetailViewDesignerUnifiedPreviewPanel } from "./DetailViewDesignerUnifiedPreviewPanel";
import { DetailViewDesignerStructureSessionProvider } from "./DetailViewDesignerStructureSession";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function DetailViewDesignerLayoutTab() {
  const { editor, canSave, layoutIsDirty, saveLayout } =
    useDetailViewDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="screen"
      designSurface="recordDetail"
      layout={editor.layout}
      setLayout={editor.setLayout}
      canSave={canSave}
      isDirty={layoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveLayout}
      treePanel={<DetailViewDesignerLayoutTreePanel />}
      previewPanel={
        <DetailViewDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <DetailViewDesignerStructureSessionProvider>
          {workbench}
        </DetailViewDesignerStructureSessionProvider>
      )}
    />
  );
}
