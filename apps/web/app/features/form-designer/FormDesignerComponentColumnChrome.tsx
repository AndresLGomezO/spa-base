import { IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  isNestedComponentColumnRef,
  type ComponentColumnRef,
} from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import {
  rootColumnContainsColumnFocus,
  rowFocusBelongsToColumn,
} from "./form-designer-component-focus";

interface FormDesignerComponentColumnChromeProps {
  readonly columnRef: ComponentColumnRef;
  readonly isColumnFocused: boolean;
  readonly hasPeerColumnFocus: boolean;
  readonly focusedColumn: ComponentColumnRef | null;
  readonly focusedRow: ComponentRowRef | null;
  readonly onHover: (column: ComponentColumnRef | null) => void;
  readonly onSelect: (column: ComponentColumnRef) => void;
  readonly children: ReactNode;
}

const columnChromeButtonClassName =
  "bg-background text-foreground pointer-events-auto shadow-md ring-1 ring-border";

const columnChromeToolbarClassName = "pointer-events-none absolute z-20";

export function FormDesignerComponentColumnChrome({
  columnRef,
  isColumnFocused,
  hasPeerColumnFocus,
  focusedColumn,
  focusedRow,
  onHover,
  onSelect,
  children,
}: FormDesignerComponentColumnChromeProps) {
  const { t } = useTranslation("common");
  const hasRowFocusInsideColumn = rowFocusBelongsToColumn(
    focusedRow,
    columnRef,
  );
  const showColumnFocus = hasPeerColumnFocus && !hasRowFocusInsideColumn;
  const containsDescendantColumnFocus =
    !isNestedComponentColumnRef(columnRef) &&
    rootColumnContainsColumnFocus(columnRef, focusedColumn);
  const isDimmed =
    showColumnFocus && !isColumnFocused && !containsDescendantColumnFocus;
  const columnLabel =
    columnRef.nestedColumnIndex != null
      ? columnRef.nestedColumnIndex + 1
      : columnRef.rootColumnIndex + 1;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col self-stretch",
        isColumnFocused && "bg-primary/10 ring-primary ring-2 ring-inset",
      )}
      onMouseEnter={() => onHover(columnRef)}
      onMouseLeave={() => onHover(null)}
      onClick={isColumnFocused ? () => onSelect(columnRef) : undefined}
      onKeyDown={
        isColumnFocused
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(columnRef);
              }
            }
          : undefined
      }
      role={isColumnFocused ? "button" : undefined}
      tabIndex={isColumnFocused ? 0 : undefined}
      aria-label={
        isColumnFocused
          ? t("formDesigner.layout.selectColumn", {
              column: columnLabel,
            })
          : undefined
      }
      data-component-column-ref={JSON.stringify(columnRef)}
    >
      {isDimmed ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-background/60"
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 flex min-h-0 w-full flex-1 flex-col",
          showColumnFocus && "pointer-events-none select-none",
        )}
      >
        {children}
      </div>

      {isColumnFocused ? (
        <div
          className={cn(
            columnChromeToolbarClassName,
            "top-1 right-1 z-40 flex items-center gap-1",
          )}
        >
          <IconButton
            type="button"
            label={t("formDesigner.layout.selectColumn", {
              column: columnLabel,
            })}
            size="sm"
            className={columnChromeButtonClassName}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(columnRef);
            }}
          >
            <MousePointer2 className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
