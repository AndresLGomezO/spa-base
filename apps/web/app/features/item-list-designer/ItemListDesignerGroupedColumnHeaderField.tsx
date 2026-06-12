import { FieldLabel, Input } from "@repo/ui";
import type { GroupedTableColumn } from "@repo/entities";
import { ComponentDisplayRangeEditor } from "@repo/ui-builder-react";
import {
  isFullDisplayRange,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { componentDisplayRangeEditorLabels } from "../ui-builder/component-display-range-editor-labels";
import { resolveExpandableTableGroupedColumnLabelPlaceholder } from "../ui-builder/expandable-table-grouped-column-label";
import { FormDesignerPanelPrimaryControls } from "../form-designer/FormDesignerPanelPrimaryControls";
import { useItemListDesigner } from "./item-list-designer-context";

interface ItemListDesignerGroupedColumnHeaderFieldProps {
  readonly columnIndex: number;
}

function applyGroupedColumnDisplayRangePatch(
  column: GroupedTableColumn,
  patch: {
    readonly displayFrom?: ResponsiveGridBreakpoint;
    readonly displayTo?: ResponsiveGridBreakpoint;
  },
): GroupedTableColumn {
  const nextDisplayFrom =
    "displayFrom" in patch ? patch.displayFrom : column.displayFrom;
  const nextDisplayTo =
    "displayTo" in patch ? patch.displayTo : column.displayTo;

  if (isFullDisplayRange(nextDisplayFrom, nextDisplayTo)) {
    const { id, label, cellLayout } = { ...column, ...patch };
    return label === undefined ? { id, cellLayout } : { id, label, cellLayout };
  }

  return { ...column, ...patch };
}

export function ItemListDesignerGroupedColumnHeaderField({
  columnIndex,
}: ItemListDesignerGroupedColumnHeaderFieldProps) {
  const { t } = useTranslation("common");
  const { editor } = useItemListDesigner();
  const definition = useEntityDefinition(editor.entityName);
  const displayRangeLabels = useMemo(
    () => componentDisplayRangeEditorLabels(t),
    [t],
  );
  const column = editor.expandableColumns[columnIndex];

  if (!column) {
    return null;
  }

  return (
    <FormDesignerPanelPrimaryControls className="flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <FieldLabel htmlFor={`grouped-column-label-${column.id}`}>
          {t("designLayout.expandableTableColumnLabel")}
        </FieldLabel>
        <Input
          id={`grouped-column-label-${column.id}`}
          value={column.label ?? ""}
          placeholder={resolveExpandableTableGroupedColumnLabelPlaceholder(
            column,
            definition,
          )}
          onChange={(event) => {
            const label = event.target.value;
            editor.setExpandableColumns(
              editor.expandableColumns.map((entry, index) =>
                index === columnIndex
                  ? { ...entry, label: label || undefined }
                  : entry,
              ),
            );
          }}
          onBlur={(event) => {
            const label = event.target.value.trim();
            editor.setExpandableColumns(
              editor.expandableColumns.map((entry, index) =>
                index === columnIndex
                  ? { ...entry, label: label || undefined }
                  : entry,
              ),
            );
          }}
        />
      </label>

      <ComponentDisplayRangeEditor
        displayFrom={column.displayFrom}
        displayTo={column.displayTo}
        labels={displayRangeLabels}
        variant="inline"
        onChange={(patch) => {
          editor.setExpandableColumns(
            editor.expandableColumns.map((entry, index) =>
              index === columnIndex
                ? applyGroupedColumnDisplayRangePatch(entry, patch)
                : entry,
            ),
          );
        }}
      />
    </FormDesignerPanelPrimaryControls>
  );
}
