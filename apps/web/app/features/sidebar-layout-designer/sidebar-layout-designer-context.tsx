import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";
import type { TenantSidebarLayoutSettings } from "@repo/entities";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseTenantSidebarLayoutEditorResult } from "../ui-builder/use-tenant-sidebar-layout-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { AppShellDesignFocus } from "./app-shell-designer-tabs";
import type { SidebarLayoutUnsavedReason } from "./sidebar-layout-designer-panel-session";

export interface SidebarLayoutDesignerContextValue {
  readonly editor: UseTenantSidebarLayoutEditorResult;
  readonly canSave: boolean;
  readonly designFocus: AppShellDesignFocus;
  readonly layoutIsDirty: boolean;
  readonly saveLayout: () => Promise<string | null>;
  readonly resetToPlatformDefault: () => Promise<string | null>;
  readonly discardLayout: () => void;
  readonly requestDesignFocusChange: (focus: AppShellDesignFocus) => void;
  readonly settings: TenantSidebarLayoutSettings;
  readonly setSettings: (settings: TenantSidebarLayoutSettings) => void;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly unsavedReason: SidebarLayoutUnsavedReason | null;
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

export const SidebarLayoutDesignerContext =
  createContext<SidebarLayoutDesignerContextValue | null>(null);

export function useSidebarLayoutDesigner(): SidebarLayoutDesignerContextValue {
  const context = useContext(SidebarLayoutDesignerContext);
  if (!context) {
    throw new Error(
      "useSidebarLayoutDesigner must be used within SidebarLayoutDesignerProvider",
    );
  }
  return context;
}
