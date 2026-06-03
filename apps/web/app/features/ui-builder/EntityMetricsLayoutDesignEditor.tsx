import { MetricStripShellEditor } from "../../components/metrics/MetricStripShellEditor.js";
import { EntityMetricsWidgetsBuilder } from "../../components/metrics/EntityMetricsWidgetsBuilder.js";
import { DesignLayoutEditorShell } from "./DesignLayoutEditorShell.js";
import { DockedMetricsStripPreview } from "./DockedMetricsStripPreview.js";
import type { UseEntityMetricsLayoutEditorResult } from "./use-entity-metrics-layout-editor.js";

interface EntityMetricsLayoutDesignEditorProps {
  readonly editor: UseEntityMetricsLayoutEditorResult;
}

export function EntityMetricsLayoutDesignEditor({
  editor,
}: EntityMetricsLayoutDesignEditorProps) {
  return (
    <DesignLayoutEditorShell
      preview={
        <DockedMetricsStripPreview
          enabled
          widgets={editor.metricWidgets}
          stripLayout={editor.metricStripLayout}
          entityDefinition={editor.definition}
        />
      }
    >
      <MetricStripShellEditor
        layout={editor.metricStripLayout}
        onChange={editor.setMetricStripLayout}
      />
      <EntityMetricsWidgetsBuilder
        widgets={editor.metricWidgets}
        metricStripLayout={editor.metricStripLayout}
        entityDefinition={editor.definition}
        filterFieldOptions={editor.filterFieldOptions}
        onChange={editor.setMetricWidgets}
      />
    </DesignLayoutEditorShell>
  );
}
