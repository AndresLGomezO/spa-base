import { useMemo } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentConfigEditor,
  ComponentDisplayRangeEditor,
} from "@repo/ui-builder-react";
import {
  componentKindsForSurface,
  isContainerComponent,
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
import { NestedLayoutRowPanel } from "../form-designer/NestedLayoutRowPanel";
import { StructureRowNameField } from "../form-designer/StructureItemNameField";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { resolveActiveLayoutBinding } from "./metrics-row-designer-layout-binding";
import { MetricWidgetComponentEditor } from "./MetricWidgetComponentEditor";
import { MetricDerivedKpiComponentEditor } from "../../components/metrics/MetricDerivedKpiComponentEditor";
import { MetricKpiComponentEditor } from "../../components/metrics/MetricKpiComponentEditor";
import { useMetricsRowDesigner } from "./metrics-row-designer-context";

interface MetricsRowDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function MetricsRowDesignerComponentRowPanel({
  rowRef,
}: MetricsRowDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor, activeTabId } = useMetricsRowDesigner();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);
  const canEdit = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const isWidgetTab = activeTabId !== "row";

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, activeTabId),
    [activeTabId, editor],
  );

  const designSurface = activeTabId === "row" ? "metricRow" : "metricWidget";
  const allowedKinds = componentKindsForSurface(designSurface);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);
  const fieldDescriptors = useMemo(() => [] as const, []);

  const filterFieldOptions = useMemo(
    () =>
      Object.keys(definition.fields).filter(
        (field) => definition.fields[field]?.type !== "document",
      ),
    [definition.fields],
  );

  const row = findRowByRef(binding.layout, rowRef);

  if (!row) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formDesigner.components.rowPanel.missingRow")}
      </Text>
    );
  }

  if (row.type === "nested-layout") {
    return (
      <NestedLayoutRowPanel
        row={row}
        rowRef={rowRef}
        binding={binding}
        labels={labels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
      />
    );
  }

  if (row.type === "component" && isContainerComponent(row.component)) {
    return (
      <ContainerComponentRowPanel
        row={row}
        rowRef={rowRef}
        binding={binding}
        labels={labels}
        componentEditorLabels={componentEditorLabels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
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
        ) : (
          <ComponentConfigEditor
            config={row.component}
            fieldDescriptors={[]}
            labels={componentEditorLabels}
            allowedKinds={allowedKinds}
            definition={definition}
            getDefinition={getDefinition}
            hideComponentStyles
            staticContentOnly={isWidgetTab}
            staticImageEditor={({ value, onChange }) => (
              <LayoutStaticImageValueEditor
                entityName={definition.name as EntityName}
                definition={definition}
                value={value}
                onChange={onChange}
                canEdit={canEdit}
              />
            )}
            metricKpiEditor={(config, onChange) => (
              <MetricKpiComponentEditor
                config={config}
                entityDefinition={definition}
                filterFieldOptions={filterFieldOptions}
                onChange={onChange}
              />
            )}
            metricDerivedKpiEditor={(config, onChange) => (
              <MetricDerivedKpiComponentEditor
                config={config}
                entityDefinition={definition}
                filterFieldOptions={filterFieldOptions}
                onChange={onChange}
              />
            )}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        )}
        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

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
