import { useMemo } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentConfigEditor,
  ComponentDisplayRangeEditor,
  entityFormFieldAdapter,
} from "@repo/ui-builder-react";
import {
  componentKindsForSurface,
  isContainerComponent,
  type MotionPreset,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { LucideIconField } from "../../components/shared/LucideIconField";
import { LayoutStaticImageValueEditor } from "../ui-builder/LayoutStaticImageValueEditor";
import { ComponentRowClickActionPanelSection } from "../ui-builder/ComponentRowClickActionPanelSection.js";
import { useFormDesignerComponentEditorLabels } from "./form-designer-component-editor-labels";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { useFormDesignerLayoutEditorLabels } from "./form-designer-layout-editor-labels";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import {
  findRowByRef,
  resolveComponentsDesignSurface,
  resolveComponentsLayoutBinding,
  type ComponentsTreeScope,
} from "./form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "./FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "./ContainerComponentRowPanel";
import { NestedLayoutRowPanel } from "./NestedLayoutRowPanel";
import { StructureRowNameField } from "./StructureItemNameField";
import { useFormDesigner } from "./form-designer-context";

interface FormDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
  readonly treeScope: ComponentsTreeScope;
  readonly stepIndex: number;
}

export function FormDesignerComponentRowPanel({
  rowRef,
  treeScope,
  stepIndex,
}: FormDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor } = useFormDesigner();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.definition.name);
  const canEdit = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, stepIndex),
    [editor, stepIndex, treeScope],
  );

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();
  const treeLabels = useMemo(() => formDesignerComponentsLabels(t).tree, [t]);

  const designSurface = resolveComponentsDesignSurface(
    editor.presentation,
    treeScope,
  );
  const allowedKinds = componentKindsForSurface(designSurface);

  const fieldDescriptors = useMemo(
    () => entityFormFieldAdapter(definition).fieldDescriptors,
    [definition],
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
        definition={definition}
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
        <ComponentConfigEditor
          config={row.component}
          fieldDescriptors={fieldDescriptors}
          labels={componentEditorLabels}
          allowedKinds={allowedKinds}
          definition={definition}
          getDefinition={getDefinition}
          hideComponentStyles
          staticImageEditor={({ value, onChange }) => (
            <LayoutStaticImageValueEditor
              entityName={definition.name as EntityName}
              definition={definition}
              value={value}
              onChange={onChange}
              canEdit={canEdit}
            />
          )}
          lucideIconEditor={({ value, onChange }) => (
            <LucideIconField
              id={`${definition.name}-component-row-icon`}
              label={t("designLayout.iconName")}
              hint={t("designLayout.iconNameHint")}
              value={value}
              onChange={onChange}
            />
          )}
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
