import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import { MetricsRowDesignerUnifiedPreviewPanel } from "./MetricsRowDesignerUnifiedPreviewPanel";
import { MetricsRowDesignerStructureSessionProvider } from "./MetricsRowDesignerStructureSession";
import { MetricsRowDesignerRowTreePanel } from "./MetricsRowDesignerRowTreePanel";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";

export function MetricsRowDesignerRowTab() {
  const { editor, canSave, rowLayoutIsDirty, saveRow } =
    useMetricsRowDesigner();

  return (
    <UnifiedDesignerLayoutTab
      scope="block"
      designSurface="metricRow"
      layout={editor.metricRowLayout}
      setLayout={editor.setMetricRowLayout}
      canSave={canSave}
      isDirty={rowLayoutIsDirty}
      isSaving={editor.isSaving}
      onSave={saveRow}
      treePanel={<MetricsRowDesignerRowTreePanel />}
      previewPanel={
        <MetricsRowDesignerUnifiedPreviewPanel withStructureChrome />
      }
      sessionWrapper={(workbench) => (
        <MetricsRowDesignerStructureSessionProvider>
          {workbench}
        </MetricsRowDesignerStructureSessionProvider>
      )}
    />
  );
}
