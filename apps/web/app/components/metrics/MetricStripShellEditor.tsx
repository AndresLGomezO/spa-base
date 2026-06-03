import { useMemo, useState } from "react";
import {
  moveRootColumn,
  removeRootColumn,
  setRootColumnCount,
  setRootColumnWidthPercent,
  updateRootColumnStyles,
  updateRootColumnStackDirection,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Text } from "@repo/ui";
import {
  ColumnStackDirectionEditor,
  LayoutColumnControls,
  StyleRulesEditor,
} from "@repo/ui-builder-react";
import { useTranslation } from "react-i18next";

import { CollapsibleSection } from "../CollapsibleSection.js";

interface MetricStripShellEditorProps {
  readonly layout: UiLayoutDocument;
  readonly onChange: (layout: UiLayoutDocument) => void;
}

export function MetricStripShellEditor({
  layout,
  onChange,
}: MetricStripShellEditorProps) {
  const { t } = useTranslation("common");
  const [activeColumn, setActiveColumn] = useState(0);
  const clampedActiveColumn = Math.min(
    activeColumn,
    Math.max(0, layout.root.columns.length - 1),
  );

  const styleRuleLabels = useMemo(
    () => ({
      addStyleRule: t("entity.viewSettings.addStyleRule"),
      removeStyleRule: t("entity.viewSettings.removeStyleRule"),
      styleProperty: t("entity.viewSettings.styleProperty"),
      styleValue: t("entity.viewSettings.styleValue"),
    }),
    [t],
  );

  const column = layout.root.columns[clampedActiveColumn];

  return (
    <CollapsibleSection
      title={t("designLayout.metricsStripStructure")}
      defaultOpen
    >
      <Text variant="muted" className="mb-3 text-sm">
        {t("designLayout.metricsStripStructureDescription")}
      </Text>

      <LayoutColumnControls
        columnCount={layout.root.columnCount}
        columns={layout.root.columns}
        activeColumn={clampedActiveColumn}
        labels={{
          layoutColumns: t("entity.viewSettings.layoutColumns"),
          columnTab: (columnIndex) =>
            t("entity.viewSettings.columnTab", { column: columnIndex }),
          columnWidthPercent: t("entity.viewSettings.columnWidthPercent"),
          columnWidthAutoHint: (percent) =>
            t("entity.viewSettings.columnWidthAutoHint", { percent }),
          moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
          moveColumnRight: t("entity.viewSettings.moveColumnRight"),
          deleteColumn: (columnIndex) =>
            t("entity.viewSettings.deleteColumn", { column: columnIndex }),
        }}
        onColumnCountChange={(count) => {
          onChange(setRootColumnCount(layout, count));
          setActiveColumn((current) =>
            Math.min(current, Math.max(0, count - 1)),
          );
        }}
        onActiveColumnChange={setActiveColumn}
        onColumnWidthPercentChange={(index, percent) =>
          onChange(setRootColumnWidthPercent(layout, index, percent))
        }
        onMoveLeft={() => {
          onChange(moveRootColumn(layout, clampedActiveColumn, -1));
          setActiveColumn((current) => Math.max(0, current - 1));
        }}
        onMoveRight={() => {
          onChange(moveRootColumn(layout, clampedActiveColumn, 1));
          setActiveColumn((current) =>
            Math.min(layout.root.columns.length - 1, current + 1),
          );
        }}
        onDelete={() => {
          onChange(removeRootColumn(layout, clampedActiveColumn));
          setActiveColumn((current) =>
            Math.min(layout.root.columns.length - 2, current),
          );
        }}
      />

      <StyleRulesEditor
        styles={layout.root.styles}
        onChange={(styles) =>
          onChange({
            ...layout,
            root: {
              ...layout.root,
              styles: styles ? [...styles] : undefined,
            },
          })
        }
        labels={{
          ...styleRuleLabels,
          title: t("designLayout.metricsStripRootStyles"),
        }}
      />

      {column ? (
        <div className="border-border mt-4 flex flex-col gap-3 rounded-lg border p-3">
          <Text className="text-sm font-medium">
            {t("entity.viewSettings.columnTab", {
              column: clampedActiveColumn + 1,
            })}
          </Text>
          <ColumnStackDirectionEditor
            stackDirection={column.stackDirection}
            onChange={(stackDirection) =>
              onChange(
                updateRootColumnStackDirection(
                  layout,
                  clampedActiveColumn,
                  stackDirection,
                ),
              )
            }
            labels={{
              title: t("entity.viewSettings.stackDirection"),
              vertical: t("entity.viewSettings.stackVertical"),
              horizontal: t("entity.viewSettings.stackHorizontal"),
            }}
          />
          <StyleRulesEditor
            styles={column.styles}
            onChange={(styles) =>
              onChange(
                updateRootColumnStyles(
                  layout,
                  clampedActiveColumn,
                  styles ?? [],
                ),
              )
            }
            labels={{
              ...styleRuleLabels,
              title: t("entity.viewSettings.columnStyles"),
            }}
          />
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
