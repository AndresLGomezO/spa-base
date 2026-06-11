import { IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { MousePointer2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  type ComponentRowRef,
} from "./form-designer-component-row-ref";
import {
  columnBelongsToRow,
  rowContainsFocus,
  rowIsWithinFocusedColumn,
} from "./form-designer-component-focus";

interface FormDesignerComponentRowChromeProps {
  readonly rowRef: ComponentRowRef;
  readonly focusedRow: ComponentRowRef | null;
  readonly focusedColumn: ComponentColumnRef | null;
  readonly onHover: (row: ComponentRowRef | null) => void;
  readonly onSelect: (row: ComponentRowRef) => void;
  readonly onDelete: (row: ComponentRowRef) => void;
  readonly children: ReactNode;
}

const rowChromeButtonClassName =
  "bg-background text-foreground pointer-events-auto shadow-md ring-1 ring-border";

const rowChromeToolbarClassName = "pointer-events-none absolute z-20";

export function FormDesignerComponentRowChrome({
  rowRef,
  focusedRow,
  focusedColumn,
  onHover,
  onSelect,
  onDelete,
  children,
}: FormDesignerComponentRowChromeProps) {
  const { t } = useTranslation("common");
  const containsFocus = rowContainsFocus(focusedRow, focusedColumn, rowRef);
  const isInsideFocusedColumn = rowIsWithinFocusedColumn(focusedColumn, rowRef);
  const hasColumnFocusInsideRow =
    focusedColumn != null && columnBelongsToRow(focusedColumn, rowRef);
  const hasActiveFocus = focusedRow != null || focusedColumn != null;
  const isFocused =
    areComponentRowRefsEqual(focusedRow, rowRef) && !hasColumnFocusInsideRow;
  const isDimmed = hasActiveFocus && !containsFocus && !isInsideFocusedColumn;
  const showRowFocus = isFocused && !isInsideFocusedColumn;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
        showRowFocus && "bg-primary/10 ring-primary ring-2 ring-inset",
      )}
      onMouseEnter={() => onHover(rowRef)}
      onMouseLeave={() => onHover(null)}
      onClick={showRowFocus ? () => onSelect(rowRef) : undefined}
      onKeyDown={
        showRowFocus
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(rowRef);
              }
            }
          : undefined
      }
      role={showRowFocus ? "button" : undefined}
      tabIndex={showRowFocus ? 0 : undefined}
      data-row-id={rowRef.rowId}
    >
      {isDimmed ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-background/60"
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
          hasActiveFocus &&
            !containsFocus &&
            !isInsideFocusedColumn &&
            "pointer-events-none select-none",
        )}
      >
        {children}
      </div>

      {showRowFocus ? (
        <div
          className={cn(
            rowChromeToolbarClassName,
            "top-1 right-1 flex items-center gap-1",
          )}
        >
          <IconButton
            type="button"
            label={t("formDesigner.components.selectRow")}
            size="sm"
            className={rowChromeButtonClassName}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(rowRef);
            }}
          >
            <MousePointer2 className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            label={t("formDesigner.components.deleteRow")}
            size="sm"
            className={rowChromeButtonClassName}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(rowRef);
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
