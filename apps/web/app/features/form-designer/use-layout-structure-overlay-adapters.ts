import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import {
  findRowByRef,
  resolveColumnRefDisplayLabel,
} from "./form-designer-components-layout";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { resolveRowNodeDisplayLabel } from "./form-designer-structure-tree";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { LayoutStructureOverlayAdapters } from "./LayoutStructureOverlay";

interface StructureOverlaySessionLike {
  readonly previewRowFocus: { readonly rowId: string } | null;
  readonly previewColumnFocus: ComponentColumnRef | null;
  clearColumnHover: () => void;
  clearRowHover?: () => void;
  setFocusedRow: (rowRef: ComponentRowRef) => void;
  setSelectedRow: (rowRef: ComponentRowRef) => void;
  setFocusedColumn: (columnRef: ComponentColumnRef) => void;
  setSelectedColumn: (columnRef: ComponentColumnRef) => void;
  hoverRow: (rowRef: ComponentRowRef | null) => void;
  hoverColumn: (columnRef: ComponentColumnRef | null) => void;
}

interface UseLayoutStructureOverlayAdaptersOptions {
  readonly enabled: boolean;
  readonly layout: UiLayoutDocument;
  readonly structureSession: StructureOverlaySessionLike | null | undefined;
  readonly requestComponentRowPanel: (
    rowRef: ComponentRowRef,
    label: string,
  ) => void;
  readonly requestComponentColumnPanel?: (
    columnRef: ComponentColumnRef,
    label: string,
  ) => void;
  readonly captureClicks?: boolean;
}

/**
 * Builds LayoutStructureOverlay adapters from a designer structure session.
 */
export function useLayoutStructureOverlayAdapters({
  enabled,
  layout,
  structureSession,
  requestComponentRowPanel,
  requestComponentColumnPanel,
  captureClicks = true,
}: UseLayoutStructureOverlayAdaptersOptions): LayoutStructureOverlayAdapters | null {
  const { t } = useTranslation("common");

  const onHoverRow = useCallback(
    (rowRef: ComponentRowRef | null) => {
      structureSession?.hoverRow(rowRef);
    },
    [structureSession],
  );

  const onHoverColumn = useCallback(
    (columnRef: ComponentColumnRef | null) => {
      structureSession?.hoverColumn(columnRef);
    },
    [structureSession],
  );

  const onSelectRow = useCallback(
    (rowRef: ComponentRowRef) => {
      if (!structureSession) {
        return;
      }
      const row = findRowByRef(layout, rowRef);
      const labels = formDesignerComponentsLabels(t);
      const label = row
        ? resolveRowNodeDisplayLabel(row, [], labels.tree)
        : rowRef.rowId;
      structureSession.clearColumnHover();
      structureSession.setFocusedRow(rowRef);
      structureSession.setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, label);
    },
    [layout, requestComponentRowPanel, structureSession, t],
  );

  const onSelectColumn = useCallback(
    (columnRef: ComponentColumnRef) => {
      if (!structureSession) {
        return;
      }
      const labels = formDesignerComponentsLabels(t);
      const label = resolveColumnRefDisplayLabel(
        layout,
        columnRef,
        labels.tree,
      );
      structureSession.clearRowHover?.();
      structureSession.setFocusedColumn(columnRef);
      structureSession.setSelectedColumn(columnRef);
      requestComponentColumnPanel?.(columnRef, label);
    },
    [layout, requestComponentColumnPanel, structureSession, t],
  );

  return useMemo(() => {
    if (!enabled || !structureSession) {
      return null;
    }
    return {
      focusedRowId: structureSession.previewRowFocus?.rowId ?? null,
      focusedColumnRef: structureSession.previewColumnFocus,
      onHoverRow,
      onHoverColumn,
      onSelectRow,
      onSelectColumn,
      captureClicks,
    };
  }, [
    captureClicks,
    enabled,
    onHoverColumn,
    onHoverRow,
    onSelectColumn,
    onSelectRow,
    structureSession,
  ]);
}
