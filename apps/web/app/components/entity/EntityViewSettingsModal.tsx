import { useCallback, useEffect, useMemo, useState } from "react";
import type { ViewConfig } from "@repo/entities";
import {
  Button,
  SegmentedSwitch,
  toast,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { putEntityUiOverride } from "../../lib/api-client";
import { entityCatalogQueryKey } from "../../query/query-client";
import { FormModal } from "../forms/FormModal";
import { CardLayoutBuilderForm } from "./CardLayoutBuilderForm";
import {
  buildLayoutFromBuilderSlots,
  createBuilderSlotsFromLayout,
  createDefaultCardViewConfig,
  type BuilderSlotDraft,
} from "./card-layout-builder-state";
import { DEFAULT_CARDS_PER_ROW } from "./entity-card-list-grid";

interface EntityViewSettingsModalProps {
  readonly entityName: EntityName;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly previewItem: Record<string, unknown> | null;
}

function getDefaultFieldPaths(
  definition: ReturnType<typeof useEntityDefinition>,
) {
  return Object.keys(definition.fields).filter(
    (field) => definition.fields[field]?.type !== "document",
  );
}

export function EntityViewSettingsModal({
  entityName,
  open,
  onClose,
  previewItem,
}: EntityViewSettingsModalProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const queryClient = useQueryClient();
  const fieldPaths = useMemo(
    () => getDefaultFieldPaths(definition),
    [definition],
  );
  const uiViews = definition.ui.views;
  const listViewType = definition.ui.listViewType;

  const [viewType, setViewType] = useState<"table" | "card">("table");
  const [columns, setColumns] = useState(4);
  const [cardsPerRow, setCardsPerRow] = useState(DEFAULT_CARDS_PER_ROW);
  const [showActions, setShowActions] = useState(true);
  const [slots, setSlots] = useState<readonly BuilderSlotDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const cardView = uiViews.find((view) => view.type === "card");
    setViewType(listViewType ?? (cardView ? "card" : "table"));

    if (cardView?.layout) {
      setSlots(createBuilderSlotsFromLayout(cardView.layout));
      setShowActions(cardView.layout.showActions ?? true);
      setCardsPerRow(cardView.layout.cardsPerRow ?? DEFAULT_CARDS_PER_ROW);
      const gridColumns =
        cardView.layout.root.type !== "slot" &&
        cardView.layout.root.columns !== undefined
          ? typeof cardView.layout.root.columns === "number"
            ? cardView.layout.root.columns
            : 4
          : 4;
      setColumns(gridColumns);
      return;
    }

    const defaultCard = createDefaultCardViewConfig(fieldPaths);
    if (defaultCard.layout) {
      setSlots(createBuilderSlotsFromLayout(defaultCard.layout));
    }
    setShowActions(true);
    setCardsPerRow(DEFAULT_CARDS_PER_ROW);
    setColumns(4);
  }, [uiViews, listViewType, fieldPaths, open]);

  const viewTypeOptions = useMemo(
    (): readonly SegmentedSwitchOption<"table" | "card">[] => [
      {
        value: "table",
        label: t("entity.viewSettings.table"),
        ariaLabel: t("entity.viewSettings.table"),
      },
      {
        value: "card",
        label: t("entity.viewSettings.card"),
        ariaLabel: t("entity.viewSettings.card"),
      },
    ],
    [t],
  );

  const buildViews = useCallback((): readonly ViewConfig[] => {
    const tableView: ViewConfig = {
      type: "table",
      name: "default",
      fields: fieldPaths,
    };

    if (viewType === "table") {
      return [tableView];
    }

    const layout = buildLayoutFromBuilderSlots(slots, {
      columns,
      showActions,
      cardsPerRow,
    });

    return [
      tableView,
      {
        type: "card",
        name: "card",
        fields: fieldPaths,
        layout,
      },
    ];
  }, [cardsPerRow, columns, fieldPaths, showActions, slots, viewType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await putEntityUiOverride(entityName, {
        views: buildViews(),
        listViewType: viewType,
      });
      await queryClient.invalidateQueries({
        queryKey: entityCatalogQueryKey,
      });
      toast.success(t("entity.viewSettings.saved"));
      onClose();
    } catch {
      toast.error(t("entity.viewSettings.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t("entity.viewSettings.title")}
      size="lg"
      scrollable={viewType !== "card"}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("entity.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSaving}
            onClick={() => void handleSave()}
          >
            {t("entity.viewSettings.save")}
          </Button>
        </div>
      }
    >
      <div
        className={
          viewType === "card"
            ? "flex min-h-0 flex-1 flex-col gap-4"
            : "flex flex-col gap-6"
        }
      >
        <div className="shrink-0 flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">
            {t("entity.viewSettings.viewType")}
          </span>
          <SegmentedSwitch
            value={viewType}
            options={viewTypeOptions}
            onChange={setViewType}
            ariaLabel={t("entity.viewSettings.viewType")}
          />
        </div>

        {viewType === "card" ? (
          <CardLayoutBuilderForm
            className="min-h-0 flex-1"
            definition={definition}
            slots={slots}
            columns={columns}
            cardsPerRow={cardsPerRow}
            showActions={showActions}
            previewItem={previewItem}
            onSlotsChange={setSlots}
            onColumnsChange={setColumns}
            onCardsPerRowChange={setCardsPerRow}
            onShowActionsChange={setShowActions}
            labels={{
              structure: t("entity.viewSettings.structure"),
              slotSettings: t("entity.viewSettings.slotSettings"),
              preview: t("entity.viewSettings.preview"),
              field: t("entity.viewSettings.field"),
              component: t("entity.viewSettings.component"),
              showLabel: t("entity.viewSettings.showLabel"),
              label: t("entity.viewSettings.label"),
              addSlot: t("entity.viewSettings.addSlot"),
              showActions: t("entity.viewSettings.showActions"),
              layoutColumns: t("entity.viewSettings.layoutColumns"),
              cardsPerRow: t("entity.viewSettings.cardsPerRow"),
              cardsPerRowHint: t("entity.viewSettings.cardsPerRowHint"),
              columnTabs: t("entity.viewSettings.columnTabs"),
              columnTab: (column) =>
                t("entity.viewSettings.columnTab", { column }),
              emptyColumn: t("entity.viewSettings.emptyColumn"),
              slotTitle: (index) =>
                t("entity.viewSettings.slotTitle", { index }),
              moveSlotUp: t("entity.viewSettings.moveSlotUp"),
              moveSlotDown: t("entity.viewSettings.moveSlotDown"),
              deleteSlot: t("entity.viewSettings.deleteSlot"),
              horizontalAlign: t("entity.viewSettings.horizontalAlign"),
              verticalAlign: t("entity.viewSettings.verticalAlign"),
              alignLeft: t("entity.viewSettings.alignLeft"),
              alignCenter: t("entity.viewSettings.alignCenter"),
              alignRight: t("entity.viewSettings.alignRight"),
              alignTop: t("entity.viewSettings.alignTop"),
              alignMiddle: t("entity.viewSettings.alignMiddle"),
              alignBottom: t("entity.viewSettings.alignBottom"),
              alignDefault: t("entity.viewSettings.alignDefault"),
              badgeColorRules: t("entity.viewSettings.badgeColorRules"),
              badgeMatchValue: t("entity.viewSettings.badgeMatchValue"),
              badgeMatchPlaceholder: t(
                "entity.viewSettings.badgeMatchPlaceholder",
              ),
              badgeColor: t("entity.viewSettings.badgeColor"),
              addBadgeRule: t("entity.viewSettings.addBadgeRule"),
              removeBadgeRule: t("entity.viewSettings.removeBadgeRule"),
              badgeVariantLabel: (variant) =>
                t(`entity.viewSettings.badgeVariant.${variant}`),
              imageSize: t("entity.viewSettings.imageSize"),
              increaseImageSize: t("entity.viewSettings.increaseImageSize"),
              decreaseImageSize: t("entity.viewSettings.decreaseImageSize"),
              textSize: t("entity.viewSettings.textSize"),
              increaseTextSize: t("entity.viewSettings.increaseTextSize"),
              decreaseTextSize: t("entity.viewSettings.decreaseTextSize"),
              textThin: t("entity.viewSettings.textThin"),
              textBold: t("entity.viewSettings.textBold"),
              textItalic: t("entity.viewSettings.textItalic"),
              textUnderline: t("entity.viewSettings.textUnderline"),
            }}
          />
        ) : null}
      </div>
    </FormModal>
  );
}
