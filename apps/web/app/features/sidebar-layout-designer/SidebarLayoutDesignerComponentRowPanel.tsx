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
  isGridComponent,
  isNavTabComponent,
  isNotificationBellComponent,
  isSidebarCollapseComponent,
  isSidebarNavComponent,
  isSidebarTriggerComponent,
  isUserComponent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import type { SerializableEntityDefinition } from "@repo/entities";

import { LucideIconField } from "../../components/shared/LucideIconField";
import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import { findRowByRef } from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "../form-designer/ContainerComponentRowPanel";
import { GridRowPanel } from "../form-designer/GridRowPanel";
import { StructureRowNameField } from "../form-designer/StructureItemNameField";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { UserComponentEditor } from "../dashboard-layout-designer/UserComponentEditor";
import { NotificationBellComponentEditor } from "../dashboard-layout-designer/NotificationBellComponentEditor";
import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";
import { ComponentRowConditionalStylesPanelSection } from "../ui-builder/ComponentRowConditionalStylesPanelSection.js";
import { appShellDesignFocusToSurface } from "./app-shell-designer-tabs";
import { resolveActiveLayoutBinding } from "./sidebar-layout-designer-layout-binding";
import { useSidebarLayoutDesigner } from "./sidebar-layout-designer-context";
import { NavTabComponentEditor } from "./NavTabComponentEditor";
import { SidebarCollapseComponentEditor } from "./SidebarCollapseComponentEditor";
import { SidebarNavComponentEditor } from "./SidebarNavComponentEditor";
import { SidebarTriggerComponentEditor } from "./SidebarTriggerComponentEditor";
import { TENANT_SIDEBAR_LAYOUT_VALIDATION_DEFINITION } from "./tenant-sidebar-layout-validation-definition";

interface SidebarLayoutDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function SidebarLayoutDesignerComponentRowPanel({
  rowRef,
}: SidebarLayoutDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor, designFocus } = useSidebarLayoutDesigner();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, designFocus),
    [designFocus, editor],
  );
  const designSurface = appShellDesignFocusToSurface(designFocus);
  const allowedKinds = componentKindsForSurface(designSurface);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);
  const fieldDescriptors = useMemo(() => [] as const, []);
  const clickActionDefinition =
    TENANT_SIDEBAR_LAYOUT_VALIDATION_DEFINITION as SerializableEntityDefinition;

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
        definition={clickActionDefinition}
        designSurface={designSurface}
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
        {isSidebarCollapseComponent(row.component) ? (
          <SidebarCollapseComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isSidebarTriggerComponent(row.component) ? (
          <SidebarTriggerComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isNavTabComponent(row.component) ? (
          <NavTabComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isSidebarNavComponent(row.component) ? (
          <SidebarNavComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isUserComponent(row.component) ? (
          <UserComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : isNotificationBellComponent(row.component) ? (
          <NotificationBellComponentEditor
            config={row.component}
            onChange={(component) => binding.updateComponent(rowRef, component)}
          />
        ) : (
          <ComponentConfigEditor
            config={row.component}
            fieldDescriptors={[]}
            labels={componentEditorLabels}
            allowedKinds={allowedKinds}
            hideComponentStyles
            staticContentOnly
            lucideIconEditor={({ value, onChange }) => (
              <LucideIconField
                id="sidebar-layout-component-row-icon"
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

      <ComponentRowClickActionPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        definition={clickActionDefinition}
        fieldDescriptors={fieldDescriptors}
        designSurface={designSurface}
      />

      <ComponentRowConditionalStylesPanelSection
        row={row}
        rowRef={rowRef}
        binding={binding}
        fieldDescriptors={fieldDescriptors}
        definition={clickActionDefinition}
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
