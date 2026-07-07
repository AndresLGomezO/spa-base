import { useMemo } from "react";
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
  isChartComponent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { findRowByRef } from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "../form-designer/ContainerComponentRowPanel";
import { GridRowPanel } from "../form-designer/GridRowPanel";
import { StructureRowNameField } from "../form-designer/StructureItemNameField";
import { resolveLayoutBinding } from "./detail-view-designer-layout-binding";
import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";
import { useDetailViewDesigner } from "./detail-view-designer-context";
import { ChartComponentEditor } from "../../components/charts/ChartComponentEditor";

interface DetailViewDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function DetailViewDesignerComponentRowPanel({
  rowRef,
}: DetailViewDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor } = useDetailViewDesigner();
  const { getDefinition, items } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);

  const binding = useMemo(() => resolveLayoutBinding(editor), [editor]);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);

  const allowedKinds = componentKindsForSurface("recordDetail");
  const designSurface = "recordDetail" as const;

  const fieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, items).fieldDescriptors,
    [definition, getDefinition, items],
  );

  const row = findRowByRef(binding.layout, rowRef);

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
        definition={definition}
        labels={labels}
        componentEditorLabels={componentEditorLabels}
        treeLabels={treeLabels}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
      />
    );
  }

  if (row.type === "component" && isChartComponent(row.component)) {
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
          <ChartComponentEditor
            config={row.component}
            entityDefinition={definition}
            filterFieldOptions={fieldDescriptors.map(
              (descriptor) => descriptor.path,
            )}
            onChange={(component) => binding.updateComponent(rowRef, component)}
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
        <ComponentConfigEditor
          config={row.component}
          fieldDescriptors={fieldDescriptors}
          labels={componentEditorLabels}
          allowedKinds={allowedKinds}
          definition={definition}
          getDefinition={getDefinition}
          hideComponentStyles
          onChange={(component) => binding.updateComponent(rowRef, component)}
        />
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
        definition={definition}
        fieldDescriptors={fieldDescriptors}
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
