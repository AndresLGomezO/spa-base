import { useMemo } from "react";
import {
  CollapsibleMotionPresetSection,
  CollapsibleStyleRulesEditor,
  ComponentConfigEditor,
  ComponentDisplayRangeEditor,
  ResponsiveGridEditor,
  filterStyleRulesForGenericEditor,
  isResponsiveGridStyleProperty,
} from "@repo/ui-builder-react";
import {
  componentKindsForSurface,
  MAX_NESTED_COLUMNS,
  type MotionPreset,
  type NestedLayoutRowNode,
} from "@repo/ui-builder-core";
import { FieldLabel, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { formDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { formDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  findRowByRef,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { resolveLayoutBinding } from "./main-view-designer-layout-binding";
import { useMainViewDesigner } from "./main-view-designer-context";

interface MainViewDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function MainViewDesignerComponentRowPanel({
  rowRef,
}: MainViewDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor } = useMainViewDesigner();
  const { getDefinition } = useEntityCatalog();
  const definition = useEntityDefinition(editor.entityName);

  const binding = useMemo(() => resolveLayoutBinding(editor), [editor]);

  const labels = useMemo(() => formDesignerLayoutEditorLabels(t), [t]);
  const componentEditorLabels = useMemo(
    () => formDesignerComponentEditorLabels(t),
    [t],
  );

  const allowedKinds = componentKindsForSurface("mainPage");

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
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <ComponentConfigEditor
          config={row.component}
          fieldDescriptors={[]}
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

function NestedLayoutRowPanel({
  row,
  rowRef,
  binding,
  labels,
}: {
  readonly row: NestedLayoutRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly labels: ReturnType<typeof formDesignerLayoutEditorLabels>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex w-24 flex-col gap-1 text-sm">
            <FieldLabel htmlFor={`nested-layout-columns-${row.id}`}>
              {labels.layoutColumns}
            </FieldLabel>
            <Input
              id={`nested-layout-columns-${row.id}`}
              type="number"
              min={1}
              max={MAX_NESTED_COLUMNS}
              value={row.columnCount}
              onChange={(event) => {
                const count = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(count)) {
                  return;
                }
                binding.setNestedRowColumnCount(rowRef, count);
              }}
            />
          </div>

          <ResponsiveGridEditor
            styles={row.styles}
            columnCount={row.columnCount}
            labels={labels.responsiveGrid}
            onChange={(styles) =>
              binding.updateNestedRowMeta(rowRef, { styles })
            }
          />
        </div>

        <ComponentDisplayRangeEditor
          displayFrom={row.displayFrom}
          displayTo={row.displayTo}
          labels={labels.displayRange}
          variant="inline"
          onChange={(patch) => binding.updateNestedRowMeta(rowRef, patch)}
        />
      </FormDesignerPanelPrimaryControls>

      <CollapsibleStyleRulesEditor
        title={labels.rowLayoutStyles}
        styles={filterStyleRulesForGenericEditor(row.styles)}
        onChange={(genericStyles) => {
          const gridStyles = (row.styles ?? []).filter((rule) =>
            isResponsiveGridStyleProperty(rule.property),
          );
          binding.updateNestedRowMeta(rowRef, {
            styles: [...genericStyles, ...gridStyles],
          });
        }}
        labels={labels.styleRules}
      />

      <CollapsibleMotionPresetSection
        title={labels.layoutEffects}
        motion={binding.layout.motion}
        onChange={(motion: MotionPreset | undefined) =>
          binding.updateLayoutMotion(motion)
        }
        labels={labels.motion}
        clearLabel={labels.motion.clearEffects}
      />
    </div>
  );
}
