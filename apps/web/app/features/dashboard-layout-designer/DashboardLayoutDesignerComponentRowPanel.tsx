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
  isDashboardSectionComponent,
  isGridComponent,
  isMetricWidgetComponent,
  isUserComponent,
  isViewFilterComponent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { findRowByRef } from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "../form-designer/ContainerComponentRowPanel";
import { GridRowPanel } from "../form-designer/GridRowPanel";
import { StructureRowNameField } from "../form-designer/StructureItemNameField";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { LucideIconField } from "../../components/shared/LucideIconField";
import { resolveActiveLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { isShellLayoutFocus } from "./dashboard-layout-designer-tabs";
import { DashboardSectionComponentEditor } from "./DashboardSectionComponentEditor";
import { UserComponentEditor } from "./UserComponentEditor";
import { MetricWidgetComponentEditor } from "../metrics-row-designer/MetricWidgetComponentEditor";
import { ViewFilterComponentEditor } from "../ui-builder/ViewFilterComponentEditor";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { TenantDashboardStaticImageValueEditor } from "./TenantDashboardStaticImageValueEditor";
import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";
import type { SerializableEntityDefinition } from "@repo/entities";

interface DashboardLayoutDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function DashboardLayoutDesignerComponentRowPanel({
  rowRef,
}: DashboardLayoutDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor, designFocus } = useDashboardLayoutDesigner();
  const { items } = useEntityCatalog();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, designFocus),
    [designFocus, editor],
  );

  const designSurface = isShellLayoutFocus(designFocus)
    ? "dashboardLayout"
    : "dashboardSection";
  const allowedKinds = componentKindsForSurface(designSurface);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);
  const fieldDescriptors = useMemo(() => [] as const, []);
  const clickActionDefinition = useMemo((): SerializableEntityDefinition => {
    return (
      items[0] ?? {
        name: "dashboard",
        fields: {},
        ui: { fields: {} },
      }
    );
  }, [items]);

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
        definition={clickActionDefinition}
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
        {isDashboardSectionComponent(row.component) ? (
          <DashboardSectionComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isUserComponent(row.component) ? (
          <UserComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isMetricWidgetComponent(row.component) ? (
          <MetricWidgetComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isViewFilterComponent(row.component) ? null : (
          <ComponentConfigEditor
            config={row.component}
            fieldDescriptors={[]}
            labels={componentEditorLabels}
            allowedKinds={allowedKinds}
            hideComponentStyles
            staticContentOnly
            staticImageEditor={({ value, onChange }) => (
              <TenantDashboardStaticImageValueEditor
                value={value}
                onChange={onChange}
              />
            )}
            lucideIconEditor={({ value, onChange }) => (
              <LucideIconField
                id="dashboard-layout-component-row-icon"
                label={t("designLayout.iconName")}
                hint={t("designLayout.iconNameHint")}
                value={value}
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

      {row.type === "component" && isViewFilterComponent(row.component) ? (
        <ViewFilterComponentEditor
          config={row.component}
          catalog={items}
          onChange={(component) => binding.updateComponent(rowRef, component)}
        />
      ) : null}

      <ComponentRowClickActionPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={clickActionDefinition}
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
