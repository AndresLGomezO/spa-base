import { useMemo } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import { metricStripHasContent } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { useTranslation } from "react-i18next";

import type { SerializableEntityDefinition } from "@repo/entities";

import type { MetricBindingContext } from "../../lib/metric-binding-resolution.js";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";
import { createEntityLayoutRenderContext } from "../../features/ui-builder/create-entity-layout-render-context.js";

interface EntityViewMetricsStripProps {
  readonly rowLayout: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly context?: MetricBindingContext;
  readonly locale?: string;
  readonly previewMode?: boolean;
}

export function EntityViewMetricsStrip({
  rowLayout,
  entityDefinition,
  context = {},
  locale = "en",
  previewMode = false,
}: EntityViewMetricsStripProps) {
  const { t } = useTranslation("common");
  const { getDefinition, items } = useEntityCatalog();

  const renderContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: context.record ?? {},
        definition: entityDefinition,
        locale,
        catalogItems: items,
        getDefinition: (entityName) => getDefinition(entityName as EntityName),
        listFilters: context.listFilters,
        routeParams: context.routeParams,
        usePreviewPlaceholder: previewMode,
        usePreviewSamples: previewMode,
        t,
      }),
    [
      context.listFilters,
      context.record,
      context.routeParams,
      entityDefinition,
      getDefinition,
      items,
      locale,
      previewMode,
      t,
    ],
  );

  if (!metricStripHasContent(rowLayout)) {
    return null;
  }

  return <RecursiveLayoutRenderer layout={rowLayout} context={renderContext} />;
}
