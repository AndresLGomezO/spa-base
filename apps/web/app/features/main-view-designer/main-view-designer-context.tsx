import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseEntityMainPageLayoutEditorResult } from "../ui-builder/use-entity-main-page-layout-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { MainViewUnsavedReason } from "./main-view-designer-panel-session";
import type { MainViewDesignerTabId } from "./main-view-designer-tabs";

export interface MainViewDesignerContextValue {
  readonly editor: UseEntityMainPageLayoutEditorResult;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: MainViewDesignerTabId;
  readonly settingsIsDirty: boolean;
  readonly layoutIsDirty: boolean;
  readonly unsavedTabId: MainViewDesignerTabId | null;
  readonly unsavedReason: MainViewUnsavedReason | null;
  readonly saveLayout: () => Promise<string | null>;
  readonly discardLayout: () => void;
  readonly requestTabChange: (tabId: MainViewDesignerTabId) => void;
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

export const MainViewDesignerContext =
  createContext<MainViewDesignerContextValue | null>(null);

export function useMainViewDesigner(): MainViewDesignerContextValue {
  const context = useContext(MainViewDesignerContext);
  if (!context) {
    throw new Error(
      "useMainViewDesigner must be used within MainViewDesignerProvider",
    );
  }
  return context;
}
