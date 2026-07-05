import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseTenantDashboardLayoutEditorResult } from "../ui-builder/use-tenant-dashboard-layout-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { DashboardLayoutUnsavedReason } from "./dashboard-layout-designer-panel-session";
import type {
  DashboardLayoutDesignFocus,
  DashboardLayoutDesignerTabId,
} from "./dashboard-layout-designer-tabs";

export interface DashboardLayoutDesignerContextValue {
  readonly editor: UseTenantDashboardLayoutEditorResult;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: DashboardLayoutDesignerTabId;
  readonly designFocus: DashboardLayoutDesignFocus;
  readonly sectionsIsDirty: boolean;
  readonly layoutIsDirty: boolean;
  readonly unsavedTabId: DashboardLayoutDesignerTabId | null;
  readonly unsavedDesignFocus: DashboardLayoutDesignFocus | null;
  readonly unsavedReason: DashboardLayoutUnsavedReason | null;
  readonly saveSections: () => Promise<string | null>;
  readonly saveLayout: () => Promise<string | null>;
  readonly discardSections: () => void;
  readonly discardLayout: () => void;
  readonly requestTabChange: (tabId: DashboardLayoutDesignerTabId) => void;
  readonly requestDesignFocusChange: (
    focus: DashboardLayoutDesignFocus,
  ) => void;
  readonly requestSectionChange: (sectionId: string) => void;
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

export const DashboardLayoutDesignerContext =
  createContext<DashboardLayoutDesignerContextValue | null>(null);

export function useDashboardLayoutDesigner(): DashboardLayoutDesignerContextValue {
  const context = useContext(DashboardLayoutDesignerContext);
  if (!context) {
    throw new Error(
      "useDashboardLayoutDesigner must be used within DashboardLayoutDesignerProvider",
    );
  }
  return context;
}
