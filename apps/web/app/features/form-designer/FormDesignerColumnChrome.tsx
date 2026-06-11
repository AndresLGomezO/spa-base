import { IconButton } from "@repo/ui";
import type { ColumnNode } from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";
import { ChevronLeft, ChevronRight, MousePointer2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FormDesignerColumnChromeProps {
  readonly columnIndex: number;
  readonly column: ColumnNode;
  readonly columnCount: number;
  readonly focusedColumnIndex: number | null;
  readonly onHover: (columnIndex: number | null) => void;
  readonly onSelect: (columnIndex: number) => void;
  readonly onMoveLeft: (columnIndex: number) => void;
  readonly onMoveRight: (columnIndex: number) => void;
  readonly onDelete: (columnIndex: number) => void;
  readonly children: ReactNode;
}

const columnChromeButtonClassName =
  "bg-background text-foreground pointer-events-auto shadow-md ring-1 ring-border";

const columnChromeToolbarClassName = "pointer-events-none absolute z-20";

export function FormDesignerColumnChrome({
  columnIndex,
  columnCount,
  focusedColumnIndex,
  onHover,
  onSelect,
  onMoveLeft,
  onMoveRight,
  onDelete,
  children,
}: FormDesignerColumnChromeProps) {
  const { t } = useTranslation("common");
  const hasColumnFocus = focusedColumnIndex !== null;
  const isFocused = focusedColumnIndex === columnIndex;
  const isDimmed = hasColumnFocus && !isFocused;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col self-stretch",
        isDimmed && "opacity-30 saturate-0",
      )}
      onMouseEnter={() => onHover(columnIndex)}
      onMouseLeave={() => onHover(null)}
      onClick={isFocused ? () => onSelect(columnIndex) : undefined}
      onKeyDown={
        isFocused
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(columnIndex);
              }
            }
          : undefined
      }
      role={isFocused ? "button" : undefined}
      tabIndex={isFocused ? 0 : undefined}
      aria-label={
        isFocused
          ? t("formDesigner.layout.selectColumn", {
              column: columnIndex + 1,
            })
          : undefined
      }
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 transition-all duration-150",
          isFocused &&
            "bg-primary/10 ring-primary cursor-pointer ring-2 ring-inset",
        )}
      />

      <div
        className={cn(
          "relative z-10 flex min-h-0 w-full flex-1 flex-col",
          hasColumnFocus && "pointer-events-none select-none",
        )}
      >
        {children}
      </div>

      {isFocused ? (
        <>
          <div
            className={cn(
              columnChromeToolbarClassName,
              "inset-y-0 left-0 flex items-center",
            )}
          >
            <IconButton
              type="button"
              label={t("formDesigner.layout.moveColumnLeft")}
              size="sm"
              className={columnChromeButtonClassName}
              disabled={columnIndex === 0}
              onClick={(event) => {
                event.stopPropagation();
                onMoveLeft(columnIndex);
              }}
            >
              <ChevronLeft className="size-4" />
            </IconButton>
          </div>

          <div
            className={cn(
              columnChromeToolbarClassName,
              "inset-y-0 right-0 flex items-center",
            )}
          >
            <IconButton
              type="button"
              label={t("formDesigner.layout.moveColumnRight")}
              size="sm"
              className={columnChromeButtonClassName}
              disabled={columnIndex >= columnCount - 1}
              onClick={(event) => {
                event.stopPropagation();
                onMoveRight(columnIndex);
              }}
            >
              <ChevronRight className="size-4" />
            </IconButton>
          </div>

          <div
            className={cn(
              columnChromeToolbarClassName,
              "top-1 right-1 flex items-center gap-1",
            )}
          >
            <IconButton
              type="button"
              label={t("formDesigner.layout.selectColumn", {
                column: columnIndex + 1,
              })}
              size="sm"
              className={columnChromeButtonClassName}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(columnIndex);
              }}
            >
              <MousePointer2 className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              label={t("formDesigner.layout.removeColumn", {
                column: columnIndex + 1,
              })}
              size="sm"
              className={columnChromeButtonClassName}
              disabled={columnCount <= 1}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(columnIndex);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
