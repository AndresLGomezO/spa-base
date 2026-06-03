import { useCallback, useEffect, useMemo, useState } from "react";
import type { ViewConfig, ViewMetricWidget } from "@repo/entities";
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
import { MetricWidgetsBuilderSection } from "../metrics/MetricWidgetsBuilderSection.js";
import { viewMetricWidgetsFromView } from "../metrics/metric-widgets-builder-state.js";

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
  const [tableMetricWidgets, setTableMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [cardMetricWidgets, setCardMetricWidgets] = useState<
    readonly ViewMetricWidget[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutEditorKey, setLayoutEditorKey] = useState(0);

  const filterFieldOptions = useMemo(() => [...fieldPaths], [fieldPaths]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const tableView = uiViews.find((view) => view.type === "table");
    const cardView = uiViews.find((view) => view.type === "card");
    setTableMetricWidgets(viewMetricWidgetsFromView(tableView?.metricWidgets));
    setCardMetricWidgets(viewMetricWidgetsFromView(cardView?.metricWidgets));
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
      setLayoutEditorKey((current) => current + 1);
      return;
    }

    const defaultCard = createDefaultCardViewConfig(fieldPaths);
    if (defaultCard.layout) {
      setSlots(createBuilderSlotsFromLayout(defaultCard.layout));
    }
    setShowActions(true);
    setCardsPerRow(DEFAULT_CARDS_PER_ROW);
    setColumns(4);
    setLayoutEditorKey((current) => current + 1);
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
      ...(tableMetricWidgets.length > 0
        ? { metricWidgets: tableMetricWidgets }
        : {}),
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
        ...(cardMetricWidgets.length > 0
          ? { metricWidgets: cardMetricWidgets }
          : {}),
      },
    ];
  }, [
    cardMetricWidgets,
    cardsPerRow,
    columns,
    fieldPaths,
    showActions,
    slots,
    tableMetricWidgets,
    viewType,
  ]);

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
      size={viewType === "card" ? "2xl" : "lg"}
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
            ? "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
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

        <MetricWidgetsBuilderSection
          widgets={
            viewType === "table" ? tableMetricWidgets : cardMetricWidgets
          }
          entityDefinition={definition}
          filterFieldOptions={filterFieldOptions}
          onChange={
            viewType === "table" ? setTableMetricWidgets : setCardMetricWidgets
          }
        />

        {viewType === "card" ? (
          <CardLayoutBuilderForm
            key={layoutEditorKey}
            className="min-h-0 max-h-full flex-1 overflow-hidden"
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
              fallbackFields: t("entity.viewSettings.fallbackFields"),
              fallbackField: (index) =>
                t("entity.viewSettings.fallbackField", { index }),
              addFallbackField: t("entity.viewSettings.addFallbackField"),
              removeFallbackField: t("entity.viewSettings.removeFallbackField"),
              component: t("entity.viewSettings.component"),
              showLabel: t("entity.viewSettings.showLabel"),
              labelPosition: t("entity.viewSettings.labelPosition"),
              labelAbove: t("entity.viewSettings.labelAbove"),
              labelBelow: t("entity.viewSettings.labelBelow"),
              label: t("entity.viewSettings.label"),
              addSlot: t("entity.viewSettings.addSlot"),
              addInnerItem: t("entity.viewSettings.addInnerItem"),
              showActions: t("entity.viewSettings.showActions"),
              layoutColumns: t("entity.viewSettings.layoutColumns"),
              slotColumns: t("entity.viewSettings.slotColumns"),
              cardsPerRow: t("entity.viewSettings.cardsPerRow"),
              cardsPerRowHint: t("entity.viewSettings.cardsPerRowHint"),
              columnTabs: t("entity.viewSettings.columnTabs"),
              columnTab: (column) =>
                t("entity.viewSettings.columnTab", { column }),
              emptyColumn: t("entity.viewSettings.emptyColumn"),
              slotTitle: (index) =>
                t("entity.viewSettings.slotTitle", { index }),
              expandSlot: t("entity.viewSettings.expandSlot"),
              collapseSlot: t("entity.viewSettings.collapseSlot"),
              moveSlotUp: t("entity.viewSettings.moveSlotUp"),
              moveSlotDown: t("entity.viewSettings.moveSlotDown"),
              moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
              moveColumnRight: t("entity.viewSettings.moveColumnRight"),
              deleteColumn: (column) =>
                t("entity.viewSettings.deleteColumn", { column }),
              deleteSlot: t("entity.viewSettings.deleteSlot"),
              horizontalAlign: t("entity.viewSettings.horizontalAlign"),
              itemHorizontalAlign: t("entity.viewSettings.itemHorizontalAlign"),
              alignSlotDefault: t("entity.viewSettings.alignSlotDefault"),
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
              textSource: t("entity.viewSettings.textSource"),
              textSourceField: t("entity.viewSettings.textSourceField"),
              textSourceFreeText: t("entity.viewSettings.textSourceFreeText"),
              freeText: t("entity.viewSettings.freeText"),
              textColor: t("entity.viewSettings.textColor"),
              textColorLabel: (color) =>
                t(`entity.viewSettings.textColorOption.${color}`),
              spacing: t("entity.viewSettings.spacing"),
              spacingHint: t("entity.viewSettings.spacingHint"),
              marginX: t("entity.viewSettings.marginX"),
              marginY: t("entity.viewSettings.marginY"),
              marginTop: t("entity.viewSettings.marginTop"),
              marginBottom: t("entity.viewSettings.marginBottom"),
              marginLeft: t("entity.viewSettings.marginLeft"),
              marginRight: t("entity.viewSettings.marginRight"),
              padding: t("entity.viewSettings.padding"),
            }}
          />
        ) : null}
      </div>
    </FormModal>
  );
}
