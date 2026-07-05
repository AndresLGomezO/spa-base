import { resolvePreviewStrategy } from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { DockedCardLayoutPreview } from "../ui-builder/DockedCardLayoutPreview";
import { DockedExpandableTableLayoutPreview } from "../ui-builder/DockedExpandableTableLayoutPreview";
import { EntityListTableLayoutPreview } from "../ui-builder/EntityListTableLayoutPreview";
import { UnifiedDesignerPreviewPanel } from "../unified-builder/UnifiedDesignerPreviewPanel";
import { useItemListDesigner } from "./item-list-designer-context";
import { useOptionalItemListDesignerStructureSession } from "./ItemListDesignerStructureSession";
import { ItemListDesignerPreviewThemeSelect } from "./ItemListDesignerPreviewThemeSelect";
import {
  useItemListDesignerCardPreviewRendererProps,
  useItemListDesignerExpandablePreviewRendererProps,
} from "./use-item-list-designer-layout-preview-wrappers";

function ItemListDesignerCardPreviewBody() {
  const { i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const { editor, previewItem } = useItemListDesigner();
  const cardLayoutRendererProps = useItemListDesignerCardPreviewRendererProps();

  return (
    <DockedCardLayoutPreview
      enabled
      layout={editor.layout}
      definition={editor.definition}
      previewItem={previewItem}
      title=""
      locale={i18n.language}
      getDefinition={getDefinition}
      {...cardLayoutRendererProps}
    />
  );
}

function ItemListDesignerExpandableTablePreviewBody() {
  const { i18n } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const { editor, previewItem } = useItemListDesigner();
  const {
    highlightedGroupedColumnIndex,
    getCellLayoutRendererProps,
    rowExpandLayoutRendererProps,
  } = useItemListDesignerExpandablePreviewRendererProps();

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
      highlightedGroupedColumnIndex={highlightedGroupedColumnIndex}
      getCellLayoutRendererProps={getCellLayoutRendererProps}
      rowExpandLayoutRendererProps={rowExpandLayoutRendererProps}
    />
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
  const previewStrategy = useMemo(() => resolvePreviewStrategy("listItem"), []);

  const previewBody = (() => {
    switch (editor.viewType) {
      case "table":
        return (
          <EntityListTableLayoutPreview
            definition={editor.definition}
            tableFields={editor.tableFields}
            showActions={editor.tableShowActions}
            previewItem={previewItem}
            title=""
            locale={i18n.language}
          />
        );
      case "expandableTable":
        if (structureSession) {
          return <ItemListDesignerExpandableTablePreviewBody />;
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
        if (structureSession) {
          return <ItemListDesignerCardPreviewBody />;
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
