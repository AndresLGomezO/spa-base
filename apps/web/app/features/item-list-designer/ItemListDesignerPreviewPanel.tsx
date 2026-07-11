import {
  resolvePreviewStrategy,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { LayoutStructureOverlay } from "../form-designer/LayoutStructureOverlay";
import { useLayoutStructureOverlayAdapters } from "../form-designer/use-layout-structure-overlay-adapters";
import { DockedCardLayoutPreview } from "../ui-builder/DockedCardLayoutPreview";
import { DockedExpandableTableLayoutPreview } from "../ui-builder/DockedExpandableTableLayoutPreview";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useItemListDesigner } from "./item-list-designer-context";
import { useOptionalItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";
import { ItemListDesignerPreviewThemeSelect } from "./ItemListDesignerPreviewThemeSelect";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";

function useActiveStructureLayout(): UiLayoutDocument {
  const { editor, structureScope } = useItemListDesigner();
  return useMemo(
    () => resolveScopeLayoutBinding(editor, structureScope).layout,
    [editor, structureScope],
  );
}

function ItemListDesignerCardPreviewBody({
  withStructureChrome,
}: {
  readonly withStructureChrome: boolean;
}) {
  const { i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const {
    editor,
    previewItem,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useItemListDesigner();
  const structureSession = useOptionalItemListDesignerStructureSession();
  const frameRef = useRef<HTMLDivElement>(null);
  const layout = useActiveStructureLayout();

  const adapters = useLayoutStructureOverlayAdapters({
    enabled: withStructureChrome,
    layout,
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks: false,
  });

  return (
    <LayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      adapters={adapters}
      className="relative min-h-0 min-w-0 flex-1"
    >
      <DockedCardLayoutPreview
        enabled
        layout={editor.layout}
        definition={editor.definition}
        previewItem={previewItem}
        title=""
        locale={i18n.language}
        getDefinition={getDefinition}
      />
    </LayoutStructureOverlay>
  );
}

function ItemListDesignerExpandableTablePreviewBody({
  withStructureChrome,
}: {
  readonly withStructureChrome: boolean;
}) {
  const { i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const {
    editor,
    previewItem,
    requestComponentRowPanel,
    requestComponentColumnPanel,
  } = useItemListDesigner();
  const structureSession = useOptionalItemListDesignerStructureSession();
  const frameRef = useRef<HTMLDivElement>(null);
  const layout = useActiveStructureLayout();

  const adapters = useLayoutStructureOverlayAdapters({
    enabled: withStructureChrome,
    layout,
    structureSession,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    captureClicks: false,
  });

  return (
    <LayoutStructureOverlay
      frameRef={frameRef}
      layout={layout}
      enabled={withStructureChrome}
      adapters={adapters}
      className="relative min-h-0 min-w-0 flex-1"
    >
      <DockedExpandableTableLayoutPreview
        enabled
        definition={editor.definition}
        columns={editor.expandableColumns}
        rowExpandLayout={editor.rowExpandLayout}
        showActions={editor.expandableShowActions}
        previewItem={previewItem}
        title=""
        locale={i18n.language}
        getDefinition={getDefinition}
        highlightedGroupedColumnIndex={
          structureSession?.focusedGroupedColumnIndex ?? null
        }
      />
    </LayoutStructureOverlay>
  );
}

export function ItemListDesignerPreviewPanel({
  fillHeight = false,
}: {
  readonly fillHeight?: boolean;
}) {
  const { i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const { editor, previewItem, previewColorScheme } = useItemListDesigner();
  const structureSession = useOptionalItemListDesignerStructureSession();
  const withStructureChrome = structureSession != null;
  const previewStrategy = useMemo(() => resolvePreviewStrategy("listItem"), []);

  const previewBody = (() => {
    switch (editor.viewType) {
      case "expandableTable":
        if (withStructureChrome) {
          return (
            <ItemListDesignerExpandableTablePreviewBody withStructureChrome />
          );
        }

        return (
          <DockedExpandableTableLayoutPreview
            enabled
            definition={editor.definition}
            columns={editor.expandableColumns}
            rowExpandLayout={editor.rowExpandLayout}
            showActions={editor.expandableShowActions}
            previewItem={previewItem}
            title=""
            locale={i18n.language}
            getDefinition={getDefinition}
          />
        );
      case "card":
        if (withStructureChrome) {
          return <ItemListDesignerCardPreviewBody withStructureChrome />;
        }

        return (
          <DockedCardLayoutPreview
            enabled
            layout={editor.layout}
            definition={editor.definition}
            previewItem={previewItem}
            title=""
            locale={i18n.language}
            getDefinition={getDefinition}
          />
        );
    }
  })();

  return (
    <UnifiedDesignerPreviewPanel
      strategy={previewStrategy}
      fillHeight={fillHeight}
      colorScheme={previewColorScheme}
      themeControls={<ItemListDesignerPreviewThemeSelect />}
      previewBody={previewBody}
    />
  );
}
