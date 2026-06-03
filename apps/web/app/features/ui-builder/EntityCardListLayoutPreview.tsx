import { useMemo } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { LayoutPreview } from "@repo/ui-builder-react";
import { Text } from "@repo/ui";
import type { SerializableEntityDefinition } from "@repo/entities";
import { useTranslation } from "react-i18next";

import {
  clampCardsPerRow,
  getEntityCardListGridClass,
} from "../../components/entity/entity-card-list-grid.js";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";
import { layoutPreviewActions } from "./layout-preview-actions.js";

export interface EntityCardListLayoutPreviewProps {
  readonly layout: UiLayoutDocument;
  readonly definition: SerializableEntityDefinition;
  readonly previewItem: Record<string, unknown> | null;
  readonly title: string;
  readonly locale: string;
  readonly compact?: boolean;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly getOneToManyCellValue?: (
    recordId: string,
    columnName: string,
  ) => string | null;
}

export function EntityCardListLayoutPreview({
  layout,
  definition,
  previewItem,
  title,
  locale,
  getDefinition,
  getOneToManyCellValue,
  compact = false,
}: EntityCardListLayoutPreviewProps) {
  const { t } = useTranslation("common");
  const previewActions = useMemo(
    () => layoutPreviewActions(layout, t),
    [layout, t],
  );

  const previewContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: previewItem ?? {},
        definition,
        locale,
        getDefinition,
        getOneToManyCellValue,
        usePreviewPlaceholder: true,
        usePreviewSamples: previewItem === null,
      }),
    [definition, getDefinition, getOneToManyCellValue, locale, previewItem],
  );

  const cardsPerRow = clampCardsPerRow(layout.cardsPerRow);
  const previewCount = compact ? 1 : cardsPerRow;
  const gridClass = compact
    ? "grid-cols-1"
    : getEntityCardListGridClass(layout.cardsPerRow);

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      <Text className={compact ? "text-sm font-medium" : "font-medium"}>
        {title}
      </Text>
      <div
        className={
          compact
            ? `grid origin-top-left scale-[0.92] gap-3 ${gridClass}`
            : `grid gap-4 ${gridClass}`
        }
      >
        {Array.from({ length: previewCount }, (_, index) => (
          <LayoutPreview
            key={index}
            layout={layout}
            context={previewContext}
            actions={previewActions}
          />
        ))}
      </div>
    </div>
  );
}
