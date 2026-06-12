import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";
import type { FormDesignerUnsavedReason } from "./form-designer-column-panel-session";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import type { ComponentsTreeScope } from "./form-designer-components-layout";
import type { FormDesignerTabId } from "./form-designer-tabs";
import type { MobilePreviewDeviceId } from "./mobile-preview-device-presets";
import type { UseFormDesignerPreviewResult } from "./use-form-designer-preview";

export interface FormDesignerContextValue {
  readonly editor: UseEntityFormLayoutEditorResult;
  readonly preview: UseFormDesignerPreviewResult;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: FormDesignerTabId;
  readonly settingsIsDirty: boolean;
  readonly layoutIsDirty: boolean;
  readonly componentsIsDirty: boolean;
  readonly unsavedTabId: FormDesignerTabId | null;
  readonly saveSettings: () => Promise<string | null>;
  readonly discardSettings: () => void;
  readonly saveLayout: () => Promise<string | null>;
  readonly discardLayout: () => void;
  readonly saveComponents: () => Promise<string | null>;
  readonly discardComponents: () => void;
  readonly markComponentsDirty: () => void;
  readonly requestTabChange: (tabId: FormDesignerTabId) => void;
  readonly unsavedChangesOpen: boolean;
  readonly pendingTabId: FormDesignerTabId | null;
  readonly confirmUnsavedSave: () => Promise<void>;
  readonly confirmUnsavedDiscard: () => void;
  readonly cancelUnsavedChanges: () => void;
  readonly unsavedReason: FormDesignerUnsavedReason | null;
  readonly columnPanelIsDirty: boolean;
  readonly selectedLayoutColumnIndex: number | null;
  readonly requestLayoutColumnPanel: (columnIndex: number) => void;
  readonly requestCloseLayoutColumnPanel: () => void;
  readonly commitColumnPanelSave: () => void;
  readonly rootLayoutPanelOpen: boolean;
  readonly rootLayoutPanelIsDirty: boolean;
  readonly requestRootLayoutPanel: () => void;
  readonly requestCloseRootLayoutPanel: () => void;
  readonly commitRootLayoutPanelSave: () => void;
  /** @deprecated Use requestLayoutColumnPanel */
  readonly openLayoutColumnPanel: (columnIndex: number) => void;
  readonly overlayPreviewOpen: boolean;
  readonly openOverlayPreview: () => void;
  readonly closeOverlayPreview: () => void;
  readonly selectedComponentRowRef: ComponentRowRef | null;
  readonly selectedComponentColumnRef: ComponentColumnRef | null;
  readonly componentRowPanelOpen: boolean;
  readonly requestComponentRowPanel: (
    rowRef: ComponentRowRef,
    label: string,
    scope: {
      readonly treeScope: ComponentsTreeScope;
      readonly stepIndex: number;
    },
  ) => void;
  readonly requestComponentColumnPanel: (
    columnRef: ComponentColumnRef,
    label: string,
    scope: {
      readonly treeScope: ComponentsTreeScope;
      readonly stepIndex: number;
    },
  ) => void;
  readonly requestCloseComponentRowPanel: () => void;
  readonly commitComponentRowPanelSave: () => void;
  readonly componentRowPanelIsDirty: boolean;
}

export const FormDesignerContext =
  createContext<FormDesignerContextValue | null>(null);

export function useFormDesigner(): FormDesignerContextValue {
  const context = useContext(FormDesignerContext);
  if (!context) {
    throw new Error("useFormDesigner must be used within FormDesignerProvider");
  }
  return context;
}
