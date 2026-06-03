import type {
  DesignSurface,
  UiComponentConfig,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import {
  UiLayoutStructurePanel,
  type UiLayoutStructurePanelLabels,
} from "@repo/ui-builder-react";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { EntityDefinitionLookup } from "@repo/ui-builder-react";
import { Input } from "@repo/ui";

interface EntityCardLayoutBuilderProps {
  readonly layout: UiLayoutDocument;
  readonly definition: SerializableEntityDefinition;
  readonly defaultFieldPath: string;
  readonly onLayoutChange: (layout: UiLayoutDocument) => void;
  readonly labels: UiLayoutStructurePanelLabels;
  readonly className?: string;
  readonly showStructureHeading?: boolean;
  readonly getDefinition?: EntityDefinitionLookup;
  readonly designSurface?: DesignSurface;
}

export function EntityCardLayoutBuilder({
  layout,
  definition,
  defaultFieldPath,
  onLayoutChange,
  labels,
  className,
  showStructureHeading = false,
  getDefinition,
  designSurface = "listItem",
}: EntityCardLayoutBuilderProps) {
  return (
    <UiLayoutStructurePanel
      designSurface={designSurface}
      className={className}
      layout={layout}
      definition={definition}
      defaultFieldPath={defaultFieldPath}
      onLayoutChange={onLayoutChange}
      labels={labels}
      showStructureHeading={showStructureHeading}
      showShowActionsControl={false}
      getDefinition={getDefinition}
      metricKpiEditor={(config, onChange) => (
        <MetricKpiConfigEditor config={config} onChange={onChange} />
      )}
    />
  );
}

function MetricKpiConfigEditor({
  config,
  onChange,
}: {
  readonly config: Extract<UiComponentConfig, { kind: "metric-kpi" }>;
  readonly onChange: (config: UiComponentConfig) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">Metric definition ID</span>
      <Input
        value={config.metricDefinitionId}
        onChange={(event) =>
          onChange({
            ...config,
            metricDefinitionId: event.target.value,
          })
        }
        placeholder="metric-definition-id"
      />
    </label>
  );
}
