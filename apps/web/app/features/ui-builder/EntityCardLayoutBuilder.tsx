import { useMemo } from "react";
import type { DesignSurface, UiLayoutDocument } from "@repo/ui-builder-core";
import {
  UiLayoutStructurePanel,
  type UiLayoutStructurePanelLabels,
} from "@repo/ui-builder-react";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { EntityDefinitionLookup } from "@repo/ui-builder-react";

import type { EntityName } from "../../entities/entity-catalog";
import { MetricKpiComponentEditor } from "../../components/metrics/MetricKpiComponentEditor.js";
import { LayoutStaticImageValueEditor } from "./LayoutStaticImageValueEditor.js";

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
  const filterFieldOptions = useMemo(
    () =>
      Object.keys(definition.fields).filter(
        (field) => definition.fields[field]?.type !== "document",
      ),
    [definition.fields],
  );

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
        <MetricKpiComponentEditor
          config={config}
          entityDefinition={definition}
          filterFieldOptions={filterFieldOptions}
          onChange={onChange}
        />
      )}
      staticImageEditor={({ value, onChange }) => (
        <LayoutStaticImageValueEditor
          entityName={definition.name as EntityName}
          definition={definition}
          value={value}
          onChange={onChange}
        />
      )}
    />
  );
}
