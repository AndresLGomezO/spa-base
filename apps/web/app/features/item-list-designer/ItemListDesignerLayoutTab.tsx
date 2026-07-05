import { updateLayoutMeta } from "@repo/ui-builder-core";
import { Switch, Select } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  clampCardsPerRow,
  MAX_CARDS_PER_ROW,
  MIN_CARDS_PER_ROW,
} from "../../components/entity/entity-card-list-grid";
import { useItemListDesigner } from "./item-list-designer-context";
import { ItemListDesignerCardLayoutTreePanel } from "./ItemListDesignerCardLayoutTreePanel";
import { ItemListDesignerPreviewPanel } from "./ItemListDesignerPreviewPanel";
import { ItemListDesignerStructureSessionProvider } from "./ItemListDesignerStructureSession";
import { UnifiedDesignerLayoutTab } from "../unified-builder/UnifiedDesignerLayoutTab";
import { designerTreeTabRootClassName } from "../ui-builder/designer-tree-workbench-classes";

export function ItemListDesignerLayoutTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, layoutIsDirty, saveLayout } = useItemListDesigner();

  const cardsPerRow = clampCardsPerRow(editor.layout.cardsPerRow);

  return (
    <div className={designerTreeTabRootClassName}>
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("entity.viewSettings.cardsPerRow")}
          </span>
          <Select
            value={cardsPerRow}
            onChange={(event) =>
              editor.setLayout(
                updateLayoutMeta(editor.layout, {
                  cardsPerRow: clampCardsPerRow(
                    Number.parseInt(event.target.value, 10),
                  ),
                }),
              )
            }
          >
            {Array.from(
              { length: MAX_CARDS_PER_ROW - MIN_CARDS_PER_ROW + 1 },
              (_, index) => {
                const value = MIN_CARDS_PER_ROW + index;
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              },
            )}
          </Select>
        </label>
        <Switch
          variant="ios"
          checked={editor.layout.showActions ?? true}
          onChange={(checked) =>
            editor.setLayout(
              updateLayoutMeta(editor.layout, { showActions: checked }),
            )
          }
          label={t("entity.viewSettings.showActions")}
        />
      </div>

      <UnifiedDesignerLayoutTab
        scope="block"
        designSurface="listItem"
        layout={editor.layout}
        setLayout={editor.setLayout}
        canSave={canSave}
        isDirty={layoutIsDirty}
        isSaving={editor.isSaving}
        onSave={saveLayout}
        treePanel={<ItemListDesignerCardLayoutTreePanel />}
        previewPanel={<ItemListDesignerPreviewPanel fillHeight />}
        sessionWrapper={(workbench) => (
          <ItemListDesignerStructureSessionProvider>
            {workbench}
          </ItemListDesignerStructureSessionProvider>
        )}
      />
    </div>
  );
}
