import { updateLayoutMeta } from "@repo/ui-builder-core";
import { Button, Switch, toast, Select } from "@repo/ui";
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

export function ItemListDesignerLayoutTab() {
  const { t } = useTranslation("common");
  const { editor, canSave, layoutIsDirty, saveLayout } = useItemListDesigner();

  const cardsPerRow = clampCardsPerRow(editor.layout.cardsPerRow);

  const handleSave = async () => {
    if (!canSave || !layoutIsDirty) {
      return;
    }

    const error = await saveLayout();
    if (!error) {
      toast.success(t("entity.viewSettings.saved"));
    } else {
      toast.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
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
        <Button
          type="button"
          className="shrink-0"
          loading={editor.isSaving}
          disabled={!canSave || !layoutIsDirty}
          onClick={() => void handleSave()}
        >
          {t("entity.viewSettings.save")}
        </Button>
      </div>

      <ItemListDesignerStructureSessionProvider>
        <div className="flex min-h-[28rem] gap-4">
          <ItemListDesignerCardLayoutTreePanel />

          <div className="min-h-0 min-w-0 flex-1">
            <ItemListDesignerPreviewPanel />
          </div>
        </div>
      </ItemListDesignerStructureSessionProvider>
    </div>
  );
}
