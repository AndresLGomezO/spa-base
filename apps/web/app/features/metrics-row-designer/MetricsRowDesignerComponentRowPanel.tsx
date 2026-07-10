import { useEffect, useMemo, useState } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentConfigEditor,
  ComponentDisplayRangeEditor,
  entityCardViewAdapter,
} from "@repo/ui-builder-react";
import {
  componentKindsForSurface,
  isContainerComponent,
  isGridComponent,
  isQueryViewerComponent,
  isChartComponent,
  isMetricWidgetComponent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";

import type { EntityName } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { LayoutStaticImageValueEditor } from "../ui-builder/LayoutStaticImageValueEditor";
import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { findRowByRef } from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "../form-designer/ContainerComponentRowPanel";
import { GridRowPanel } from "../form-designer/GridRowPanel";
import { StructureRowNameField } from "../form-designer/StructureItemNameField";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { resolveActiveLayoutBinding } from "./metrics-row-designer-layout-binding";
import { MetricWidgetComponentEditor } from "./MetricWidgetComponentEditor";
import { QueryViewerComponentEditor } from "./QueryViewerComponentEditor";
import { MetricDerivedKpiComponentEditor } from "../../components/metrics/MetricDerivedKpiComponentEditor";
import { MetricKpiComponentEditor } from "../../components/metrics/MetricKpiComponentEditor";
import { ChartComponentEditor } from "../../components/charts/ChartComponentEditor";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";
import {
  listEntityQueryDefinitions,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import {
  resolveQueryViewerSourceDefinition,
  isInsideQueryViewerTemplate,
} from "../ui-builder/resolve-query-viewer-field-context";
import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";
import { ComponentRowConditionalStylesPanelSection } from "../ui-builder/ComponentRowConditionalStylesPanelSection.js";

interface MetricsRowDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function MetricsRowDesignerComponentRowPanel({
  rowRef,
}: MetricsRowDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor, activeTabId } = useMetricsRowDesigner();
  const canEdit = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const isWidgetTab = activeTabId !== "row";
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const [queryDefinitions, setQueryDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadQueryDefinitions() {
      try {
        const result = await listEntityQueryDefinitions();
        if (!cancelled) {
          setQueryDefinitions(result.items);
        }
      } catch {
        if (!cancelled) {
          setQueryDefinitions([]);
        }
      }
    }

    if (isWidgetTab) {
      void loadQueryDefinitions();
    }

    return () => {
      cancelled = true;
    };
  }, [isWidgetTab]);

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, activeTabId),
    [activeTabId, editor],
  );

  const designSurface = activeTabId === "row" ? "metricRow" : "metricWidget";
  const allowedKinds = componentKindsForSurface(designSurface);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);

  const row = findRowByRef(binding.layout, rowRef);

  const queryViewerSourceDefinition = useMemo(() => {
    if (!row) {
      return null;
    }

    return resolveQueryViewerSourceDefinition(
      binding.layout,
      row.id,
      queryDefinitions,
      items,
    );
  }, [binding.layout, items, queryDefinitions, row]);

  const fieldDefinition = queryViewerSourceDefinition ?? definition;

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(fieldDefinition, getDefinition, items)
        .fieldDescriptors,
    [fieldDefinition, getDefinition, items],
  );

  const allowEntityFieldBinding = queryViewerSourceDefinition !== null;
  const staticContentOnly = isWidgetTab && !allowEntityFieldBinding;

  const needsQuerySelectionForFields = useMemo(() => {
    if (!row) {
      return false;
    }

    return (
      isInsideQueryViewerTemplate(binding.layout, row.id) &&
      queryViewerSourceDefinition === null
    );
  }, [binding.layout, queryViewerSourceDefinition, row]);

  const filterFieldOptions = useMemo(
    () =>
      Object.keys(fieldDefinition.fields).filter(
        (field) => fieldDefinition.fields[field]?.type !== "document",
      ),
    [fieldDefinition.fields],
  );

  if (!row) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formDesigner.components.rowPanel.missingRow")}
      </Text>
    );
  }
  if (row.type === "component" && isGridComponent(row.component)) {
    return (
      <GridRowPanel
        row={row.component}
        rowNode={row}
        rowRef={rowRef}
        binding={binding}
        definition={definition}
        designSurface={designSurface}
        labels={labels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
      />
    );
  }

  if (row.type === "component" && isQueryViewerComponent(row.component)) {
    return (
      <ContainerComponentRowPanel
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={fieldDefinition}
        labels={labels}
        componentEditorLabels={componentEditorLabels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
        extraControls={
          <QueryViewerComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        }
      />
    );
  }

  if (row.type === "component" && isContainerComponent(row.component)) {
    return (
      <ContainerComponentRowPanel
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={fieldDefinition}
        labels={labels}
        componentEditorLabels={componentEditorLabels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <StructureRowNameField
          id={`component-row-name-${row.id}`}
          row={row}
          fieldDescriptors={fieldDescriptors}
          treeLabels={treeLabels}
          onChange={(name) => binding.updateRowMeta(rowRef, { name })}
        />
        {isMetricWidgetComponent(row.component) ? (
          <MetricWidgetComponentEditor
            config={row.component}
            currentEntityName={editor.entityName}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isChartComponent(row.component) ? (
          <ChartComponentEditor
            config={row.component}
            entityDefinition={fieldDefinition}
            filterFieldOptions={filterFieldOptions}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : (
          <ComponentConfigEditor
            config={row.component}
            fieldDescriptors={fieldDescriptors}
            labels={componentEditorLabels}
            allowedKinds={allowedKinds}
            definition={fieldDefinition}
            getDefinition={getDefinition}
            hideComponentStyles
            staticContentOnly={staticContentOnly}
            staticImageEditor={({ value, onChange }) => (
              <LayoutStaticImageValueEditor
                entityName={fieldDefinition.name as EntityName}
                definition={fieldDefinition}
                value={value}
                onChange={onChange}
                canEdit={canEdit}
              />
            )}
            metricKpiEditor={(config, onChange) => (
              <MetricKpiComponentEditor
                config={config}
                entityDefinition={fieldDefinition}
                filterFieldOptions={filterFieldOptions}
                onChange={onChange}
              />
            )}
            metricDerivedKpiEditor={(config, onChange) => (
              <MetricDerivedKpiComponentEditor
                config={config}
                entityDefinition={fieldDefinition}
                filterFieldOptions={filterFieldOptions}
                onChange={onChange}
              />
            )}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        )}
        {needsQuerySelectionForFields ? (
          <Text className="text-muted-foreground text-sm">
            {t("metricsRowDesigner.queryViewerEditor.selectQueryForFields")}
          </Text>
        ) : null}
        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

      <ComponentRowClickActionPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={fieldDefinition}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
      />

      <ComponentRowConditionalStylesPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        fieldDescriptors={fieldDescriptors}
        definition={definition}
        designSurface={designSurface}
      />

      <CollapsibleStyleRulesEditor
        title={componentEditorLabels.componentStyles}
        styles={row.component.styles}
        onChange={(styles) =>
          binding.updateComponent(rowRef, { ...row.component, styles })
        }
        labels={labels.styleRules}
      />

      <CollapsibleStyleRulesEditor
        title={labels.rowStyles}
        styles={row.styles}
        onChange={(styles) => binding.updateRowMeta(rowRef, { styles })}
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.rowEffects}
        motion={row.motion}
        onChange={(motion: MotionPreset | undefined) =>
          binding.updateRowMeta(rowRef, { motion })
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
