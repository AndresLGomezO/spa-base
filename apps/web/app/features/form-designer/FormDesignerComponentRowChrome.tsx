import { IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import type { RowNode, UiLayoutDocument } from "@repo/ui-builder-core";
import { MousePointer2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { PreviewFocusState } from "./preview-focus-state";
import {
  resolveParentStackAlign,
  resolveParentStackDirection,
  resolveParentStackUsesFlexWrap,
  resolveParentStackStyles,
  resolvePreviewRowChromeLayoutClasses,
  rowPrefersFlexGrow,
  rowUsesContentWidth,
} from "./preview-row-chrome-layout";

interface FormDesignerComponentRowChromeProps {
  readonly rowRef: ComponentRowRef;
  readonly row: RowNode;
  readonly layout?: UiLayoutDocument;
  readonly focusState: PreviewFocusState;
  readonly isStructuralRow: boolean;
  readonly onHover?: (row: ComponentRowRef | null) => void;
  readonly onSelect: (row: ComponentRowRef) => void;
  readonly onDelete: (row: ComponentRowRef) => void;
  readonly children: ReactNode;
}

const rowChromeButtonClassName =
  "bg-background text-foreground pointer-events-auto shadow-md ring-1 ring-border";

const rowChromeToolbarClassName = "pointer-events-none absolute z-40";

const rowChromeFocusRingClassName =
  "pointer-events-none absolute inset-0 z-0 bg-primary/10 ring-primary ring-2 ring-inset";

const rowChromeDimOverlayClassName =
  "pointer-events-none absolute inset-0 z-20 bg-background/60";

const rowChromeHitLayerClassName = "absolute inset-0 z-30";

export function FormDesignerComponentRowChrome({
  rowRef,
  row,
  layout,
  focusState,
  isStructuralRow,
  onHover,
  onSelect,
  onDelete,
  children,
}: FormDesignerComponentRowChromeProps) {
  const { t } = useTranslation("common");
  const isFocused = focusState === "focused";
  const isDimmed = focusState === "dimmed";
  const useHitLayer = !isStructuralRow && onHover != null;
  const parentStackDirection = layout
    ? resolveParentStackDirection(layout, rowRef.locator)
    : "column";
  const parentStackAlign = layout
    ? resolveParentStackAlign(layout, rowRef.locator)
    : undefined;
  const parentUsesFlexWrap = layout
    ? resolveParentStackUsesFlexWrap(layout, rowRef.locator)
    : false;
  const parentStackStyles = layout
    ? resolveParentStackStyles(layout, rowRef.locator)
    : undefined;
  const layoutClasses = resolvePreviewRowChromeLayoutClasses({
    parentStackDirection,
    parentStackAlign,
    parentUsesFlexWrap,
    parentStackStyles,
    row,
    isStructuralRow,
    preferFlexGrow: rowPrefersFlexGrow(row),
    preferContentWidth: rowUsesContentWidth(row),
  });

  return (
    <div
      className={layoutClasses.shell}
      style={layoutClasses.shellStyle}
      data-row-id={rowRef.rowId}
      onMouseEnter={
        isStructuralRow && onHover ? () => onHover(rowRef) : undefined
      }
      onMouseLeave={
        isStructuralRow && onHover ? () => onHover(null) : undefined
      }
    >
      {isFocused ? (
        <div aria-hidden className={rowChromeFocusRingClassName} />
      ) : null}

      <div className={cn(layoutClasses.inner, "z-10")}>{children}</div>

      {isDimmed && !isStructuralRow ? (
        <div aria-hidden className={rowChromeDimOverlayClassName} />
      ) : null}

      {useHitLayer ? (
        <div
          className={rowChromeHitLayerClassName}
          onMouseEnter={() => onHover(rowRef)}
          onMouseLeave={() => onHover(null)}
          onClick={isFocused ? () => onSelect(rowRef) : undefined}
          onKeyDown={
            isFocused
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(rowRef);
                  }
                }
              : undefined
          }
          role={isFocused ? "button" : undefined}
          tabIndex={isFocused ? 0 : undefined}
        />
      ) : null}

      {isFocused && !isStructuralRow ? (
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
