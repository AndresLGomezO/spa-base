import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseEntityMetricsWidgetsEditorResult } from "../ui-builder/use-entity-metrics-widgets-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { MetricsRowUnsavedReason } from "./metrics-row-designer-panel-session";
import type { MetricsRowDesignerTabId } from "./metrics-row-designer-tabs";

export interface MetricsRowDesignerContextValue {
  readonly editor: UseEntityMetricsWidgetsEditorResult;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: MetricsRowDesignerTabId;
  readonly widgetsIsDirty: boolean;
  readonly rowLayoutIsDirty: boolean;
  readonly unsavedTabId: MetricsRowDesignerTabId | null;
  readonly unsavedReason: MetricsRowUnsavedReason | null;
  readonly saveWidgets: () => Promise<string | null>;
  readonly saveRow: () => Promise<string | null>;
  readonly discardWidgets: () => void;
  readonly discardRowLayout: () => void;
  readonly requestTabChange: (tabId: MetricsRowDesignerTabId) => void;
  readonly requestWidgetChange: (widgetId: string) => void;
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

export const MetricsRowDesignerContext =
  createContext<MetricsRowDesignerContextValue | null>(null);

export function useMetricsRowDesigner(): MetricsRowDesignerContextValue {
  const context = useContext(MetricsRowDesignerContext);
  if (!context) {
    throw new Error(
      "useMetricsRowDesigner must be used within MetricsRowDesignerProvider",
    );
  }
  return context;
}
