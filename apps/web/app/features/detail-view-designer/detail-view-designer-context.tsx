import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseEntityRecordDetailLayoutEditorResult } from "../ui-builder/use-entity-record-detail-layout-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { DetailViewUnsavedReason } from "./detail-view-designer-panel-session";
import type { DetailViewDesignerTabId } from "./detail-view-designer-tabs";

export interface DetailViewDesignerContextValue {
  readonly editor: UseEntityRecordDetailLayoutEditorResult;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: DetailViewDesignerTabId;
  readonly settingsIsDirty: boolean;
  readonly layoutIsDirty: boolean;
  readonly unsavedTabId: DetailViewDesignerTabId | null;
  readonly unsavedReason: DetailViewUnsavedReason | null;
  readonly saveLayout: () => Promise<string | null>;
  readonly discardLayout: () => void;
  readonly requestTabChange: (tabId: DetailViewDesignerTabId) => void;
  readonly unsavedChangesOpen: boolean;
  readonly confirmUnsavedSave: () => Promise<void>;
  readonly confirmUnsavedDiscard: () => void;
  readonly cancelUnsavedChanges: () => void;
  readonly structurePanelOpen: boolean;
  readonly structurePanelIsDirty: boolean;
  readonly selectedStructureRowRef: ComponentRowRef | null;
  readonly selectedStructureColumnRef: ComponentColumnRef | null;
  readonly requestComponentRowPanel: (
    rowRef: ComponentRowRef,
    label: string,
  ) => void;
  readonly requestComponentColumnPanel: (
    columnRef: ComponentColumnRef,
    label: string,
  ) => void;
  readonly requestCloseStructurePanel: () => void;
  readonly commitStructurePanelSave: () => void;
}

export const DetailViewDesignerContext =
  createContext<DetailViewDesignerContextValue | null>(null);

export function useDetailViewDesigner(): DetailViewDesignerContextValue {
  const context = useContext(DetailViewDesignerContext);
  if (!context) {
    throw new Error(
      "useDetailViewDesigner must be used within DetailViewDesignerProvider",
    );
  }
  return context;
}
