import { createContext, useContext } from "react";
import type { ColorScheme } from "@repo/theme/react";

import type { LayoutPreviewBreakpoint } from "../ui-builder/LayoutPreviewPanel";
import type { UseEntityListLayoutEditorResult } from "../ui-builder/use-entity-list-layout-editor";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import type { ItemListDesignerTabId } from "./item-list-designer-tabs";
import type { ItemListUnsavedReason } from "./item-list-designer-panel-session";
import type {
  ItemListColumnsScope,
  ItemListStructureScope,
} from "./item-list-designer-structure-scope";

export interface ItemListDesignerContextValue {
  readonly editor: UseEntityListLayoutEditorResult;
  readonly previewItem: Record<string, unknown> | null;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly previewMobileDeviceId: MobilePreviewDeviceId;
  readonly setPreviewMobileDeviceId: (deviceId: MobilePreviewDeviceId) => void;
  readonly previewColorScheme: ColorScheme;
  readonly setPreviewColorScheme: (colorScheme: ColorScheme) => void;
  readonly activeTabId: ItemListDesignerTabId;
  readonly settingsIsDirty: boolean;
  readonly columnsIsDirty: boolean;
  readonly layoutIsDirty: boolean;
  readonly unsavedTabId: ItemListDesignerTabId | null;
  readonly unsavedReason: ItemListUnsavedReason | null;
  readonly saveSettings: () => Promise<string | null>;
  readonly discardSettings: () => void;
  readonly saveColumns: () => Promise<string | null>;
  readonly discardColumns: () => void;
  readonly saveLayout: () => Promise<string | null>;
  readonly discardLayout: () => void;
  readonly requestTabChange: (tabId: ItemListDesignerTabId) => void;
  readonly unsavedChangesOpen: boolean;
  readonly confirmUnsavedSave: () => Promise<void>;
  readonly confirmUnsavedDiscard: () => void;
  readonly cancelUnsavedChanges: () => void;
  readonly columnsScope: ItemListColumnsScope;
  readonly requestColumnsScopeChange: (scope: ItemListColumnsScope) => void;
  readonly activeGroupedColumnIndex: number;
  readonly setActiveGroupedColumnIndex: (columnIndex: number) => void;
  readonly structureScope: ItemListStructureScope;
  readonly structurePanelOpen: boolean;
  readonly structurePanelIsDirty: boolean;
  readonly selectedStructureRowRef: ComponentRowRef | null;
  readonly selectedStructureColumnRef: ComponentColumnRef | null;
  readonly selectedGroupedColumnIndex: number | null;
  readonly requestComponentRowPanel: (
    rowRef: ComponentRowRef,
    label: string,
  ) => void;
  readonly requestComponentColumnPanel: (
    columnRef: ComponentColumnRef,
    label: string,
  ) => void;
  readonly requestGroupedColumnPanel: (
    columnIndex: number,
    label: string,
  ) => void;
  readonly requestCloseStructurePanel: () => void;
  readonly commitStructurePanelSave: () => void;
}

export const ItemListDesignerContext =
  createContext<ItemListDesignerContextValue | null>(null);

export function useItemListDesigner(): ItemListDesignerContextValue {
  const context = useContext(ItemListDesignerContext);
  if (!context) {
    throw new Error(
      "useItemListDesigner must be used within ItemListDesignerProvider",
    );
  }
  return context;
}
