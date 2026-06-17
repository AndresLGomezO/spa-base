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
  isContainerComponent,
  isDashboardSectionComponent,
  isMetricWidgetComponent,
  isUserComponent,
  isViewFilterComponent,
  MAX_NESTED_COLUMNS,
  type MotionPreset,
  type NestedLayoutRowNode,
} from "@repo/ui-builder-core";
import { FieldLabel, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useFormDesignerComponentEditorLabels } from "../form-designer/form-designer-component-editor-labels";
import { useFormDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { formDesignerLayoutEditorLabels } from "../form-designer/form-designer-layout-editor-labels";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  findRowByRef,
  type ComponentsLayoutBinding,
} from "../form-designer/form-designer-components-layout";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { ContainerComponentRowPanel } from "../form-designer/ContainerComponentRowPanel";
import { LucideIconField } from "../../components/shared/LucideIconField";
import { resolveActiveLayoutBinding } from "./dashboard-layout-designer-layout-binding";
import { DashboardSectionComponentEditor } from "./DashboardSectionComponentEditor";
import { UserComponentEditor } from "./UserComponentEditor";
import { MetricWidgetComponentEditor } from "../metrics-row-designer/MetricWidgetComponentEditor";
import { ViewFilterComponentEditor } from "../ui-builder/ViewFilterComponentEditor";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useDashboardLayoutDesigner } from "./dashboard-layout-designer-context";
import { TenantDashboardStaticImageValueEditor } from "./TenantDashboardStaticImageValueEditor";

interface DashboardLayoutDesignerComponentRowPanelProps {
  readonly rowRef: ComponentRowRef;
}

export function DashboardLayoutDesignerComponentRowPanel({
  rowRef,
}: DashboardLayoutDesignerComponentRowPanelProps) {
  const { t } = useTranslation("common");
  const { editor, activeTabId } = useDashboardLayoutDesigner();
  const { items } = useEntityCatalog();

  const binding = useMemo(
    () => resolveActiveLayoutBinding(editor, activeTabId),
    [activeTabId, editor],
  );

  const designSurface =
    activeTabId === "layout" ? "dashboardLayout" : "dashboardSection";
  const allowedKinds = componentKindsForSurface(designSurface);

  const labels = useFormDesignerLayoutEditorLabels();
  const componentEditorLabels = useFormDesignerComponentEditorLabels();

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

  if (row.type === "component" && isContainerComponent(row.component)) {
    return (
      <ContainerComponentRowPanel
        row={row}
        rowRef={rowRef}
        binding={binding}
        labels={labels}
        componentEditorLabels={componentEditorLabels}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormDesignerPanelPrimaryControls className="flex-col gap-3">
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
