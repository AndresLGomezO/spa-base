import { useCallback, useMemo, useRef, useState } from "react";
import { Columns2 } from "lucide-react";
import { Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import { formatFieldLabel } from "../../entities/entity-catalog";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { FormDesignerStructureTreeRowActions } from "../form-designer/FormDesignerStructureTreeRowActions";
import { FormDesignerStructureTreeUtilNode } from "../form-designer/FormDesignerStructureTreeUtilNode";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerTreePanelShell } from "./ItemListDesignerTreePanelShell";

const FLYOUT_CLOSE_DELAY_MS = 150;

function moveField(
  fields: readonly string[],
  index: number,
  direction: -1 | 1,
): readonly string[] {
  const target = index + direction;
  if (target < 0 || target >= fields.length) {
    return fields;
  }
  const next = [...fields];
  const [item] = next.splice(index, 1);
  if (item === undefined) {
    return fields;
  }
  next.splice(target, 0, item);
  return next;
}

export function ItemListDesignerColumnsTreePanel() {
  const { t } = useTranslation("common");
  const { editor } = useItemListDesigner();
  const { definition, tableFields, setTableFields } = editor;
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [focusedFieldIndex, setFocusedFieldIndex] = useState<number | null>(
    null,
  );
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
  const closeFlyoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const unselectedFields = useMemo(
    () => editor.fieldPaths.filter((field) => !tableFields.includes(field)),
    [editor.fieldPaths, tableFields],
  );

  const clearFlyoutCloseTimer = useCallback(() => {
    if (closeFlyoutTimerRef.current) {
      clearTimeout(closeFlyoutTimerRef.current);
      closeFlyoutTimerRef.current = null;
    }
  }, []);

  const handleFlyoutOpenChange = useCallback(
    (fieldName: string, open: boolean) => {
      clearFlyoutCloseTimer();
      if (open) {
        setOpenFlyoutId(fieldName);
        return;
      }

      closeFlyoutTimerRef.current = setTimeout(() => {
        setOpenFlyoutId((current) => (current === fieldName ? null : current));
      }, FLYOUT_CLOSE_DELAY_MS);
    },
    [clearFlyoutCloseTimer],
  );

  const addField = (fieldName: string) => {
    if (!fieldName || tableFields.includes(fieldName)) {
      return;
    }
    setTableFields([...tableFields, fieldName]);
  };

  const removeField = (fieldName: string) => {
    if (tableFields.length <= 1) {
      return;
    }
    setTableFields(tableFields.filter((field) => field !== fieldName));
  };

  const renderTableColumnRow = (fieldName: string, index: number) => {
    const nodeId = `column-${fieldName}`;
    const fieldLabel = formatFieldLabel(fieldName, definition);

    return (
      <div
        role="treeitem"
        aria-labelledby={`${nodeId}-label`}
        data-tree-node-id={nodeId}
        className="group/node hover:bg-muted/50 flex w-full min-w-0 items-center gap-1 rounded-md py-1.5 pr-2 pl-1 transition-all duration-150"
        onMouseEnter={() => setFocusedFieldIndex(index)}
        onMouseLeave={() =>
          setFocusedFieldIndex((current) =>
            current === index ? null : current,
          )
        }
      >
        <Columns2
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0"
          strokeWidth={2}
        />
        <div
          id={`${nodeId}-label`}
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span className="truncate text-sm">{fieldLabel}</span>
          <span className="text-muted-foreground truncate text-xs">
            {fieldName}
          </span>
        </div>
        <FormDesignerStructureTreeRowActions
          moveUpLabel={t("designLayout.moveColumnUp")}
          moveDownLabel={t("designLayout.moveColumnDown")}
          deleteLabel={t("designLayout.removeColumn")}
          canMoveUp={index > 0}
          canMoveDown={index < tableFields.length - 1}
          onMoveUp={() => setTableFields(moveField(tableFields, index, -1))}
          onMoveDown={() => setTableFields(moveField(tableFields, index, 1))}
          onDelete={() => removeField(fieldName)}
        />
      </div>
    );
  };

  const addColumnFooter =
    unselectedFields.length > 0 ? (
      <div className="border-border border-t px-3 py-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.addTableColumn")}
          </span>
          <Select
            value=""
            onChange={(event) => {
              addField(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">
              {t("designLayout.addTableColumnPlaceholder")}
            </option>
            {unselectedFields.map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {formatFieldLabel(fieldName, definition)} ({fieldName})
              </option>
            ))}
          </Select>
        </label>
      </div>
    ) : null;

  const expandedContent =
    tableFields.length === 0 ? (
      <Text className="text-muted-foreground px-2 py-1 text-sm">
        {t("designLayout.tableColumnsEmpty")}
      </Text>
    ) : (
      <div role="tree" aria-label={t("designLayout.tableColumnOrder")}>
        {tableFields.map((fieldName, index) => (
          <div key={fieldName}>{renderTableColumnRow(fieldName, index)}</div>
        ))}
      </div>
    );

  const collapsedContent = (
    <div
      role="tree"
      aria-label={t("designLayout.tableColumnOrder")}
      className="flex w-full flex-col items-center gap-1 py-1"
    >
      {tableFields.length === 0 ? (
        <Text className="text-muted-foreground px-1 py-2 text-center text-[10px] leading-tight">
          {t("designLayout.tableColumnsEmpty")}
        </Text>
      ) : (
        tableFields.map((fieldName, index) => {
          const fieldLabel = formatFieldLabel(fieldName, definition);
          const rowFocusState =
            focusedFieldIndex === index ? "focused" : "none";

          return (
            <FormDesignerStructureTreeUtilNode
              key={fieldName}
              id={fieldName}
              label={fieldLabel}
              kind="text"
              rowFocusState={rowFocusState}
              flyoutOpen={openFlyoutId === fieldName}
              onFlyoutOpenChange={(open) =>
                handleFlyoutOpenChange(fieldName, open)
              }
              onHover={() => setFocusedFieldIndex(index)}
              onLeave={() =>
                setFocusedFieldIndex((current) =>
                  current === index ? null : current,
                )
              }
            >
              {renderTableColumnRow(fieldName, index)}
            </FormDesignerStructureTreeUtilNode>
          );
        })
      )}
    </div>
  );

  return (
    <ItemListDesignerTreePanelShell
      title={t("itemListDesigner.columnsPanelTitle")}
      expandLabel={labels.expandPanel}
      collapseLabel={labels.collapsePanel}
      expandedClassName="w-80"
      expandedBodyClassName="pt-2"
      collapsedContent={collapsedContent}
      footer={addColumnFooter}
    >
      {expandedContent}
    </ItemListDesignerTreePanelShell>
  );
}
