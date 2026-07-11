import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import {
  componentColumnRefKey,
  parseLayoutColumnIdAttr,
  toLayoutColumnIdAttr,
} from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import { findRowRefById } from "./preview-focus-state";

const LAYOUT_ROW_ID_ATTR = "data-layout-row-id";
const LAYOUT_COLUMN_ID_ATTR = "data-layout-column-id";

interface HighlightRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

function escapeAttrValue(value: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function measureAttrHighlight(
  frame: HTMLElement,
  attrName: string,
  attrValue: string,
): HighlightRect | null {
  const target = frame.querySelector<HTMLElement>(
    `[${attrName}="${escapeAttrValue(attrValue)}"]`,
  );
  if (!target) {
    return null;
  }

  const frameRect = frame.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return {
    top: targetRect.top - frameRect.top + frame.scrollTop,
    left: targetRect.left - frameRect.left + frame.scrollLeft,
    width: targetRect.width,
    height: targetRect.height,
  };
}

function closestAttrValue(
  target: EventTarget | null,
  attrName: string,
): string | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const host = target.closest(`[${attrName}]`);
  if (!(host instanceof HTMLElement)) {
    return null;
  }
  return host.getAttribute(attrName);
}

export interface LayoutStructureOverlayAdapters {
  readonly focusedRowId: string | null;
  readonly focusedColumnRef: ComponentColumnRef | null;
  readonly onHoverRow: (rowRef: ComponentRowRef | null) => void;
  readonly onHoverColumn: (columnRef: ComponentColumnRef | null) => void;
  readonly onSelectRow: (rowRef: ComponentRowRef) => void;
  readonly onSelectColumn: (columnRef: ComponentColumnRef) => void;
  /**
   * When true, click capture preventDefaults (e.g. footer nav Links).
   * Defaults to true.
   */
  readonly captureClicks?: boolean;
}

interface LayoutStructureOverlayProps {
  readonly frameRef: RefObject<HTMLDivElement | null>;
  readonly layout: UiLayoutDocument;
  readonly enabled: boolean;
  readonly adapters: LayoutStructureOverlayAdapters | null;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Layout-neutral structure chrome for designer previews.
 * Measures real runtime DOM hosts (`data-layout-row-id` / `data-layout-column-id`)
 * and draws an overlay so flex/grid geometry matches production.
 */
export function LayoutStructureOverlay({
  frameRef,
  layout,
  enabled,
  adapters,
  className,
  children,
}: LayoutStructureOverlayProps) {
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);

  const focusedRowId = enabled ? (adapters?.focusedRowId ?? null) : null;
  const focusedColumnKey =
    enabled && adapters?.focusedColumnRef
      ? componentColumnRefKey(adapters.focusedColumnRef)
      : null;

  const updateHighlight = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !adapters) {
      setHighlight(null);
      return;
    }

    if (focusedColumnKey && adapters.focusedColumnRef) {
      setHighlight(
        measureAttrHighlight(
          frame,
          LAYOUT_COLUMN_ID_ATTR,
          toLayoutColumnIdAttr(adapters.focusedColumnRef),
        ),
      );
      return;
    }

    if (focusedRowId) {
      setHighlight(
        measureAttrHighlight(frame, LAYOUT_ROW_ID_ATTR, focusedRowId),
      );
      return;
    }

    setHighlight(null);
  }, [adapters, focusedColumnKey, focusedRowId, frameRef]);

  useLayoutEffect(() => {
    updateHighlight();
  }, [updateHighlight, layout]);

  useEffect(() => {
    if (!enabled || (!focusedRowId && !focusedColumnKey)) {
      return;
    }
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const observer = new ResizeObserver(() => updateHighlight());
    observer.observe(frame);
    window.addEventListener("resize", updateHighlight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHighlight);
    };
  }, [enabled, focusedColumnKey, focusedRowId, frameRef, updateHighlight]);

  const handlePointerMove = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!enabled || !adapters) {
        return;
      }

      const columnAttr = closestAttrValue(event.target, LAYOUT_COLUMN_ID_ATTR);
      if (columnAttr) {
        const columnRef = parseLayoutColumnIdAttr(columnAttr);
        if (columnRef) {
          adapters.onHoverColumn(columnRef);
          adapters.onHoverRow(null);
          return;
        }
      }

      const rowId = closestAttrValue(event.target, LAYOUT_ROW_ID_ATTR);
      if (!rowId) {
        adapters.onHoverRow(null);
        adapters.onHoverColumn(null);
        return;
      }
      adapters.onHoverColumn(null);
      adapters.onHoverRow(findRowRefById(layout, rowId));
    },
    [adapters, enabled, layout],
  );

  const handlePointerLeave = useCallback(() => {
    if (!enabled || !adapters) {
      return;
    }
    adapters.onHoverRow(null);
    adapters.onHoverColumn(null);
  }, [adapters, enabled]);

  const handleClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!enabled || !adapters) {
        return;
      }

      if (adapters.captureClicks !== false) {
        event.preventDefault();
        event.stopPropagation();
      }

      const columnAttr = closestAttrValue(event.target, LAYOUT_COLUMN_ID_ATTR);
      if (columnAttr) {
        const columnRef = parseLayoutColumnIdAttr(columnAttr);
        if (columnRef) {
          adapters.onSelectColumn(columnRef);
          return;
        }
      }

      const rowId = closestAttrValue(event.target, LAYOUT_ROW_ID_ATTR);
      if (!rowId) {
        return;
      }
      const rowRef = findRowRefById(layout, rowId);
      if (rowRef) {
        adapters.onSelectRow(rowRef);
      }
    },
    [adapters, enabled, layout],
  );

  return (
    <div
      ref={frameRef}
      className={className ?? "relative"}
      onMouseMove={enabled ? handlePointerMove : undefined}
      onMouseLeave={enabled ? handlePointerLeave : undefined}
      onClickCapture={enabled ? handleClickCapture : undefined}
    >
      {children}
      {enabled && highlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-30 bg-primary/10 ring-primary ring-2 ring-inset"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      ) : null}
    </div>
  );
}
